
class HABookmarkCards extends HTMLElement {
  setConfig(config) {
    this.config = {
      title: "Mina bokmärken",
      columns: 2,
      show_url: false,
      ...config
    };
  }

  set hass(hass) {
    this._hass = hass;

    if (!this.loaded) {
      this.loaded = true;
      this.load();
    }

    this.render();
  }

  async load() {
    try {
      const result = await this._hass.callWS({
        type: "ha_bookmark_cards/get"
      });

      this.groups = result.groups || [];
      this.render();
    } catch (error) {
      console.error("Bookmark Cards:", error);
    }
  }

  async save() {
    await this._hass.callWS({
      type: "ha_bookmark_cards/save",
      groups: this.groups
    });

    this.render();
  }

  async addGroup() {
    const name = prompt("Namn på gruppen:");

    if (!name) return;

    this.groups.push({
      id: crypto.randomUUID(),
      name,
      bookmarks: []
    });

    await this.save();
  }

  async addBookmark(group) {
    const title = prompt("Bokmärkets namn:");
    if (!title) return;

    const url = prompt("Webbadress:");
    if (!url) return;

    group.bookmarks.push({
      id: crypto.randomUUID(),
      title,
      url
    });

    await this.save();
  }

  async editBookmark(group, bookmark) {
    const title = prompt("Ändra namn:", bookmark.title);
    if (!title) return;

    const url = prompt("Ändra webbadress:", bookmark.url);
    if (!url) return;

    bookmark.title = title;
    bookmark.url = url;

    await this.save();
  }

  async deleteBookmark(group, bookmark) {
    if (!confirm("Ta bort bokmärket?")) return;

    group.bookmarks =
      group.bookmarks.filter(item => item.id !== bookmark.id);

    await this.save();
  }

  async renameGroup(group) {
    const name = prompt("Nytt gruppnamn:", group.name);

    if (!name) return;

    group.name = name;
    await this.save();
  }

  async deleteGroup(group) {
    if (!confirm("Ta bort hela gruppen?")) return;

    this.groups = this.groups.filter(item => item.id !== group.id);

    await this.save();
  }

  render() {
    if (!this._hass || !this.config || !this.groups) return;

    this.innerHTML = `
      <ha-card header="${this.config.title}">
        <div class="toolbar">
          <button id="add-group">＋ Ny grupp</button>
        </div>

        <div class="groups"
          style="grid-template-columns:repeat(${this.config.columns},minmax(0,1fr))">

          ${this.groups.map(group => `
            <div class="group">
              <div class="group-header">
                <strong>${this.escape(group.name)}</strong>

                <button data-rename="${group.id}">✎</button>
                <button data-delete-group="${group.id}">🗑</button>
              </div>

              ${(group.bookmarks || []).map(bookmark => `
                <div class="bookmark">
                  <a href="${this.escape(bookmark.url)}"
                     target="_blank"
                     rel="noopener noreferrer">
                    ${this.escape(bookmark.title)}
                  </a>

                  ${this.config.show_url
                    ? `<small>${this.escape(bookmark.url)}</small>`
                    : ""}

                  <button data-edit="${group.id}|${bookmark.id}">✎</button>
                  <button data-delete="${group.id}|${bookmark.id}">×</button>
                </div>
              `).join("")}

              <button data-add="${group.id}">
                ＋ Lägg till bokmärke
              </button>
            </div>
          `).join("")}

        </div>
      </ha-card>

      <style>
        .toolbar {
          padding: 12px;
        }

        .groups {
          display: grid;
          gap: 12px;
          padding: 12px;
        }

        .group {
          border: 1px solid var(--divider-color);
          border-radius: 10px;
          padding: 12px;
        }

        .group-header {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-bottom: 10px;
        }

        .group-header strong {
          flex: 1;
        }

        .bookmark {
          padding: 9px 0;
          border-top: 1px solid var(--divider-color);
          overflow-wrap: anywhere;
        }

        .bookmark a {
          font-weight: 500;
        }

        .bookmark small {
          display: block;
          color: var(--secondary-text-color);
        }

        button {
          cursor: pointer;
          border: 0;
          border-radius: 6px;
          padding: 7px;
          margin: 2px;
          color: var(--primary-text-color);
          background: var(--secondary-background-color);
        }
      </style>
    `;

    this.querySelector("#add-group")
      ?.addEventListener("click", () => this.addGroup());

    this.querySelectorAll("[data-rename]").forEach(button => {
      button.onclick = () => {
        const group = this.groups.find(g => g.id === button.dataset.rename);
        this.renameGroup(group);
      };
    });

    this.querySelectorAll("[data-delete-group]").forEach(button => {
      button.onclick = () => {
        const group = this.groups.find(g => g.id === button.dataset.deleteGroup);
        this.deleteGroup(group);
      };
    });

    this.querySelectorAll("[data-add]").forEach(button => {
      button.onclick = () => {
        const group = this.groups.find(g => g.id === button.dataset.add);
        this.addBookmark(group);
      };
    });

    this.querySelectorAll("[data-edit]").forEach(button => {
      button.onclick = () => {
        const [gid, bid] = button.dataset.edit.split("|");
        const group = this.groups.find(g => g.id === gid);
        const bookmark = group.bookmarks.find(b => b.id === bid);
        this.editBookmark(group, bookmark);
      };
    });

    this.querySelectorAll("[data-delete]").forEach(button => {
      button.onclick = () => {
        const [gid, bid] = button.dataset.delete.split("|");
        const group = this.groups.find(g => g.id === gid);
        const bookmark = group.bookmarks.find(b => b.id === bid);
        this.deleteBookmark(group, bookmark);
      };
    });
  }

  escape(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }
}

customElements.define("ha-bookmark-cards", HABookmarkCards);

window.customCards = window.customCards || [];

window.customCards.push({
  type: "ha-bookmark-cards",
  name: "Bookmark Cards",
  description: "Bokmärkesgrupper för Home Assistant"
});
