
from pathlib import Path
from typing import Any

import voluptuous as vol

from homeassistant.core import HomeAssistant
from homeassistant.config_entries import ConfigEntry
from homeassistant.helpers.storage import Store
from homeassistant.components import websocket_api
from homeassistant.components.http import StaticPathConfig

DOMAIN = "ha_bookmark_cards"
STORAGE_VERSION = 1
STORAGE_KEY = DOMAIN


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    store = Store(hass, STORAGE_VERSION, STORAGE_KEY)
    saved = await store.async_load()

    hass.data[DOMAIN] = {
        "store": store,
        "groups": saved.get("groups", []) if saved else [],
    }

    websocket_api.async_register_command(hass, ws_get)
    websocket_api.async_register_command(hass, ws_save)

    js_path = Path(__file__).parent / "www"

    await hass.http.async_register_static_paths([
        StaticPathConfig(
            "/ha-bookmark-cards/ha-bookmark-cards.js",
            str(js_path / "ha-bookmark-cards.js"),
            False,
        )
    ])

    return True


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
) -> bool:
    return True


async def async_unload_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
) -> bool:
    return True


@websocket_api.websocket_command({
    vol.Required("type"): "ha_bookmark_cards/get",
})
@websocket_api.async_response
async def ws_get(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    data = hass.data[DOMAIN]

    connection.send_result(
        msg["id"],
        {"groups": data["groups"]},
    )


@websocket_api.websocket_command({
    vol.Required("type"): "ha_bookmark_cards/save",
    vol.Required("groups"): list,
})
@websocket_api.async_response
async def ws_save(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    data = hass.data[DOMAIN]

    data["groups"] = msg["groups"]

    await data["store"].async_save({
        "groups": data["groups"],
    })

    connection.send_result(
        msg["id"],
        {"success": True},
    )
