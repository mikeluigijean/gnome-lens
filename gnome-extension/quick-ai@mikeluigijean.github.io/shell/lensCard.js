// "Ask Quick AI" card shown top-right after a screenshot: thumbnail + action buttons. Falls back to a
// regular notification when banners are off (Do Not Disturb) or the screen is locked.
// Ported from buds-notifier's lib/popups.js (same author), reduced to one card at a time.
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as MessageTray from 'resource:///org/gnome/shell/ui/messageTray.js';

const TIMEOUT_S = 6;
const HOVER_LEAVE_TIMEOUT_S = 3;
const MARGIN = 16;
const SLIDE = -24;
const ANIMATION_MS = 220;

export class LensCard {
    constructor(gicon) {
        this._gicon = gicon;
        this._notificationSettings = new Gio.Settings({schema_id: 'org.gnome.desktop.notifications'});
        this._card = null;
        this._timeoutId = 0;
        this._source = null;
    }

    /**
     * @param {Gio.File} file the screenshot
     * @param {{id: string, label: string, callback: Function}[]} actions
     */
    show(file, actions) {
        if (this._notificationSettings.get_boolean('show-banners') && !Main.sessionMode.isLocked)
            this._showCard(file, actions);
        else
            this._notify(file, actions);
    }

    destroy() {
        this._close(false);
        this._source?.destroy();
        this._source = null;
        this._notificationSettings = null;
    }

    _showCard(file, actions) {
        this._close(false);
        const card = new St.BoxLayout({
            style_class: 'quick-ai-card',
            orientation: Clutter.Orientation.VERTICAL,
            reactive: true,
            track_hover: true,
        });

        const header = new St.BoxLayout({style_class: 'quick-ai-card-header'});
        header.add_child(new St.Icon({gicon: this._gicon, style_class: 'quick-ai-card-icon'}));
        header.add_child(new St.Label({
            text: 'Ask Quick AI',
            style_class: 'quick-ai-card-title',
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
        }));
        const close = new St.Button({
            style_class: 'quick-ai-card-close',
            child: new St.Icon({icon_name: 'window-close-symbolic', icon_size: 14}),
        });
        close.connect('clicked', () => this._close(true));
        header.add_child(close);
        card.add_child(header);

        card.add_child(new St.Widget({
            style_class: 'quick-ai-card-thumbnail',
            style: `background-image: url("${file.get_uri()}");`,
        }));

        const buttons = new St.BoxLayout({style_class: 'quick-ai-card-actions'});
        for (const {label, callback} of actions) {
            const button = new St.Button({label, style_class: 'button quick-ai-card-button', x_expand: true});
            button.connect('clicked', () => {
                this._close(true);
                callback();
            });
            buttons.add_child(button);
        }
        card.add_child(buttons);

        // Hovering pauses auto-hide; leaving gives a few more seconds.
        card.connect('notify::hover', () => {
            if (this._card !== card)
                return;
            if (card.hover)
                this._stopTimeout();
            else
                this._startTimeout(HOVER_LEAVE_TIMEOUT_S);
        });

        this._card = card;
        Main.layoutManager.addTopChrome(card);
        const area = Main.layoutManager.getWorkAreaForMonitor(Main.layoutManager.primaryIndex);
        const [, width] = card.get_preferred_width(-1);
        card.set_position(area.x + area.width - width - MARGIN, area.y + MARGIN);
        card.opacity = 0;
        card.translation_y = SLIDE;
        card.ease({opacity: 255, translation_y: 0, duration: ANIMATION_MS, mode: Clutter.AnimationMode.EASE_OUT_QUAD});
        this._startTimeout(TIMEOUT_S);
    }

    _notify(file, actions) {
        if (!this._source) {
            this._source = new MessageTray.Source({title: 'Quick AI', gicon: this._gicon});
            this._source.connect('destroy', () => {
                this._source = null;
            });
            Main.messageTray.add(this._source);
        }
        const notification = new MessageTray.Notification({
            source: this._source,
            title: 'Ask Quick AI',
            body: 'About the screenshot you just took',
            gicon: new Gio.FileIcon({file}),
        });
        for (const {label, callback} of actions)
            notification.addAction(label, callback);
        this._source.addNotification(notification);
    }

    _startTimeout(seconds) {
        this._stopTimeout();
        this._timeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, seconds, () => {
            this._timeoutId = 0;
            this._close(true);
            return GLib.SOURCE_REMOVE;
        });
    }

    _stopTimeout() {
        if (this._timeoutId) {
            GLib.source_remove(this._timeoutId);
            this._timeoutId = 0;
        }
    }

    _close(animate) {
        this._stopTimeout();
        const card = this._card;
        if (!card)
            return;
        this._card = null;
        // Destroying the actor also untracks it from the layout manager.
        if (!animate) {
            card.destroy();
            return;
        }
        card.reactive = false;
        card.ease({
            opacity: 0,
            translation_y: SLIDE,
            duration: ANIMATION_MS,
            mode: Clutter.AnimationMode.EASE_IN_QUAD,
            onStopped: () => card.destroy(),
        });
    }
}
