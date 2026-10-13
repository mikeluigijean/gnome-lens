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
    <!-- Lens: show the chat and attach the content to the active site's prompt box. Never sends. -->
    <method name="AskImage">
      <arg type="ay" direction="in" name="png"/>
      <arg type="s" direction="in" name="action"/>
    </method>
    <method name="AskText">
      <arg type="s" direction="in" name="text"/>
      <arg type="s" direction="in" name="action"/>
    </method>
    <property name="Visible" type="b" access="read"/>
    <property name="Pinned" type="b" access="read"/>
  </interface>
</node>`;
