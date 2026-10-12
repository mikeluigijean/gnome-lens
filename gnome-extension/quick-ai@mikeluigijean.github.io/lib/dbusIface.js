// The chat app's D-Bus interface: the one contract between the shell side and the app.
// Versioned name (…QuickAI1): add methods freely, never change existing signatures.
import {IFACE} from './constants.js';

export const QUICK_AI_IFACE_XML = `
<node>
  <interface name="${IFACE}">
    <method name="Toggle"/>
    <method name="Show"/>
    <method name="Hide"/>
    <method name="Quit"/>
    <property name="Visible" type="b" access="read"/>
    <property name="Pinned" type="b" access="read"/>
  </interface>
</node>`;
