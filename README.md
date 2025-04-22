# Read Aloud Pro Browser Extension

Read Aloud Pro is a browser extension that reads web page content aloud with synchronized highlighting and customizable playback options. It's designed to provide a seamless reading experience for users who prefer to listen to content rather than read it.

## Features

-   **Intelligent Content Extraction**: Automatically identifies and extracts the main content from web pages, ignoring navigation, ads, and other distractions.
-   **Synchronized Highlighting**: Highlights words as they are being read, making it easy to follow along.
-   **Floating Control Bar**: A draggable, unobtrusive control bar that allows you to play, pause, stop, and navigate through the content.
-   **Customizable Speech**: Adjust speech rate, pitch, volume, and select from available system voices.
-   **Context Menu Integration**: Right-click to read selected text or start reading from a specific point on the page.
-   **Settings Persistence**: Your preferred settings are saved and synchronized across devices.

## Installation

### From Source

1. Clone this repository or download the source code.
2. Open your browser's extension management page:
    - Chrome: `chrome://extensions/`
    - Edge: `edge://extensions/`
    - Firefox: `about:addons`
3. Enable Developer Mode (usually a toggle in the top-right corner).
4. Click "Load unpacked" (Chrome/Edge) or "Load Temporary Add-on" (Firefox).
5. Select the `extension` folder from the downloaded source code.

## Usage

1. Click the Read Aloud Pro icon in your browser toolbar to open the popup.
2. Click "Start Reading" to begin reading the current page.
3. Use the floating control bar to control playback:
    - Play/Pause: Toggle between playing and pausing.
    - Stop: Stop reading and remove the control bar.
    - Previous/Next Sentence: Navigate between sentences.
    - Settings: Open the settings panel to adjust speech properties.
4. Right-click on any text to access context menu options:
    - "Read selected text": Read only the selected text.
    - "Read from this text onwards": Start reading from the clicked position to the end of the page.

## Settings

Access the settings page by clicking the settings icon in the floating control bar or by right-clicking the extension icon and selecting "Options".

-   **Rate**: Adjust how fast the text is read (0.5x to 2.0x).
-   **Pitch**: Adjust the pitch of the voice (0.0 to 2.0).
-   **Volume**: Control the volume independently of your system volume.
-   **Voice**: Select from available system voices.

## Browser Compatibility

-   Google Chrome (version 88+)
-   Microsoft Edge (version 88+)
-   Firefox (version 78+)

## Privacy

Read Aloud Pro respects your privacy:

-   No data is sent to external servers.
-   All speech synthesis is performed locally using your browser's Web Speech API.
-   Settings are stored in your browser's sync storage and are only accessible by the extension.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

-   Uses a modified version of Mozilla's [Readability](https://github.com/mozilla/readability) library for content extraction.
-   Icons and UI elements inspired by Material Design.
