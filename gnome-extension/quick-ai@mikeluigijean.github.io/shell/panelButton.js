// Top bar icon. A menu rather than a click handler: the panel click API changed in GNOME 50,
// while menus work the same on 48–51.
import GObject from 'gi://GObject';
import St from 'gi://St';

import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

export const PanelButton = GObject.registerClass(
class QuickAIPanelButton extends PanelMenu.Button {
    _init({gicon, onToggle, onLens, onPreferences}) {
        super._init(0.5, 'Quick AI');
        this.add_child(new St.Icon({gicon, style_class: 'system-status-icon'}));
        this.menu.addAction('Show / hide chat', onToggle);
        this.menu.addAction('Lens: ask about part of the screen', onLens);
        this.menu.addAction('Preferences', onPreferences);
    }
});
