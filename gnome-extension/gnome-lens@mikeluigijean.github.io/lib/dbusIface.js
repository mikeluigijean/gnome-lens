// The chat app's D-Bus interface: the one contract between the shell side and the app.
import {IFACE} from './constants.js';

export const GNOME_LENS_IFACE_XML = `
<node>
  <interface name="${IFACE}">
    <method name="Toggle"/>
    <method name="Quit"/>
    <!-- Show the chat and attach the content to the active site's prompt box. Never sends. -->
    <method name="AskImage">
      <arg type="ay" direction="in" name="png"/>
      <arg type="s" direction="in" name="action"/>
    </method>
    <method name="AskText">
      <arg type="s" direction="in" name="text"/>
      <arg type="s" direction="in" name="action"/>
    </method>
  </interface>
</node>`;
