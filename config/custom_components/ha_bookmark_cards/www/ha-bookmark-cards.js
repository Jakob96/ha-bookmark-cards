
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
      this.groups = [];
      this.render();
    }
  }

  async save() {
    try {
      await this._hass.callWS({
        type: "ha_bookmark_cards/save",
        groups: this.groups
      });

      this.render();
    } catch (error) {
      console.error("Kunde inte spara bokmärken:", error);
      alert("Det gick inte att spara bokmärkena.");
    }
  }

  async addGroup() {
    const name = prompt("Namn på gruppen:");
    if (!name?.trim()) return;

    this.groups.push({
      id: crypto.randomUUID(),
      name: name.trim(),
      bookmarks: []
    });

    await this.save();
  }

  async addBookmark(group) {
    const title = prompt("Bokmärkets namn:");
    if (!title?.trim()) return;

    const url = prompt("Webbadress:");
    if (!url?.trim()) return;

    group.bookmarks.push({
      id: crypto.randomUUID(),
      title: title.trim(),
      url: url.trim()
    });

    await this.save();
  }

  async editBookmark(group, bookmark) {
    const title = prompt("Ändra namn:", bookmark.title);
    if (!title?.trim()) return;

    const url = prompt("Ändra webbadress:", bookmark.url);
    if (!url?.trim()) return;

    bookmark.title = title.trim();
    bookmark.url = url.trim();

    await this.save();
  }

  async deleteBookmark(group, bookmark) {
    if (!confirm("Ta bort bokmärket?")) return;

    group.bookmarks = group.bookmarks.filter(
      item => item.id !== bookmark.id
    );

    await this.save();
  }

  async renameGroup(group) {
    const name = prompt("Nytt gruppnamn:", group.name);
    if (!name?.trim()) return;

    group.name = name.trim();
    await this.save();
  }

  async deleteGroup(group) {
    if (!confirm("Ta bort hela gruppen och dess bokmärken?")) {
      return;
    }

    this.groups = this.groups.filter(
      item => item.id !== group.id
    );

    await this.save();
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

  render() {
    if (!this._hass || !this.config || !this.groups) return;

    const columns = Math.max(
      1,
      Math.min(4, Number(this.config.columns) || 2)
    );

    this.innerHTML = `
      <ha-card header="${this.escape(this.config.title)}">

        <div class="toolbar">
          <button id="add-group">＋ Ny grupp</button>
        </div>

        <div class="groups"
          style="grid-template-columns:repeat(${columns},minmax(0,1fr))">

          ${this.groups.map(group => `
            <section class="group">

              <div class="group-header">
                <strong>${this.escape(group.name)}</strong>
                <button data-rename="${this.escape(group.id)}">✎</button>
                <button data-delete-group="${this.escape(group.id)}">🗑</button>
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

                  <div class="actions">
                    <button data-edit="${this.escape(group.id)}|${this.escape(bookmark.id)}">✎</button>
                    <button data-delete="${this.escape(group.id)}|${this.escape(bookmark.id)}">×</button>
                  </div>
                </div>
              `).join("")}

              <button data-add="${this.escape(group.id)}">
                ＋ Lägg till bokmärke
              </button>

            </section>
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
          min-width: 0;
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
          overflow-wrap: anywhere;
        }

        .bookmark {
          position: relative;
          padding: 10px 60px 10px 0;
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

        .actions {
          position: absolute;
          right: 0;
          top: 5px;
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
        const group = this.groups.find(
          item => item.id === button.dataset.rename
        );
        this.renameGroup(group);
      };
    });

    this.querySelectorAll("[data-delete-group]").forEach(button => {
      button.onclick = () => {
        const group = this.groups.find(
          item => item.id === button.dataset.deleteGroup
        );
        this.deleteGroup(group);
      };
    });

    this.querySelectorAll("[data-add]").forEach(button => {
      button.onclick = () => {
        const group = this.groups.find(
          item => item.id === button.dataset.add
        );
        this.addBookmark(group);
      };
    });

    this.querySelectorAll("[data-edit]").forEach(button => {
      button.onclick = () => {
        const [groupId, bookmarkId] = button.dataset.edit.split("|");

        const group = this.groups.find(
          item => item.id === groupId
        );

        const bookmark = group.bookmarks.find(
          item => item.id === bookmarkId
        );

        this.editBookmark(group, bookmark);
      };
    });

    this.querySelectorAll("[data-delete]").forEach(button => {
      button.onclick = () => {
        const [groupId, bookmarkId] = button.dataset.delete.split("|");

        const group = this.groups.find(
          item => item.id === groupId
        );

        const bookmark = group.bookmarks.find(
          item => item.id === bookmarkId
        );

        this.deleteBookmark(group, bookmark);
      };
    });
  }
}

if (!customElements.get("ha-bookmark-cards")) {
  customElements.define("ha-bookmark-cards", HABookmarkCards);
}

window.customCards = window.customCards || [];

window.customCards.push({
  type: "ha-bookmark-cards",
  name: "Bookmark Cards",
  description: "Bokmärkesgrupper för Home Assistant"
});
