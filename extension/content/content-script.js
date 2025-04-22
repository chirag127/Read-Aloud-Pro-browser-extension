/**
 * Content script for Read Aloud Pro extension
 * Handles text extraction, speech synthesis, and highlighting
 */

// Import the Readability class
// @ts-ignore
const Readability =
    window.Readability ||
    (typeof require !== "undefined" ? require("./readability.js") : null);

/**
 * Main class for Read Aloud functionality
 */
class ReadAloudPro {
    constructor() {
        // Speech synthesis
        this.synth = window.speechSynthesis;
        this.utterance = null;
        this.voices = [];
        this.currentVoice = null;

        // Reading state
        this.isReading = false;
        this.isPaused = false;
        this.currentSentenceIndex = 0;
        this.currentWordIndex = 0;

        // Content
        this.articleContent = null;
        this.sentences = [];
        this.words = [];
        this.wordElements = [];

        // UI elements
        this.floatingBar = null;
        this.settingsPanel = null;

        // Settings
        this.settings = {
            speechRate: 1.0,
            speechPitch: 1.0,
            selectedVoiceURI: "",
            playbackVolume: 1.0,
        };

        // Initialize
        this.init();
    }

    /**
     * Initialize the Read Aloud functionality
     */
    init() {
        // Load settings
        this.loadSettings();

        // Initialize speech synthesis
        this.initSpeechSynthesis();

        // Listen for messages from background script
        this.setupMessageListeners();
    }

    /**
     * Load user settings from storage
     */
    loadSettings() {
        chrome.storage.sync.get(
            ["speechRate", "speechPitch", "selectedVoiceURI", "playbackVolume"],
            (result) => {
                if (result.speechRate !== undefined) {
                    this.settings.speechRate = result.speechRate;
                }
                if (result.speechPitch !== undefined) {
                    this.settings.speechPitch = result.speechPitch;
                }
                if (result.selectedVoiceURI !== undefined) {
                    this.settings.selectedVoiceURI = result.selectedVoiceURI;
                }
                if (result.playbackVolume !== undefined) {
                    this.settings.playbackVolume = result.playbackVolume;
                }
            }
        );
    }

    /**
     * Initialize speech synthesis and get available voices
     */
    initSpeechSynthesis() {
        // Get available voices
        this.voices = this.synth.getVoices();

        // If voices are not available immediately, wait for them to load
        if (this.voices.length === 0) {
            this.synth.onvoiceschanged = () => {
                this.voices = this.synth.getVoices();
            };
        }
    }

    /**
     * Set up message listeners for communication with background script
     */
    setupMessageListeners() {
        chrome.runtime.onMessage.addListener(
            (message, sender, sendResponse) => {
                switch (message.action) {
                    case "startReading":
                        this.startReading();
                        break;
                    case "stopReading":
                        this.stopReading();
                        break;
                    case "readSelectedText":
                        this.readSelectedText(message.text);
                        break;
                    case "readFromHere":
                        this.readFromHere();
                        break;
                    case "updateSettings":
                        this.updateSettings(message.settings);
                        break;
                }
            }
        );
    }

    /**
     * Extract article content using Readability
     */
    extractArticleContent() {
        try {
            const documentClone = document.cloneNode(true);
            const reader = new Readability(documentClone);
            const article = reader.parse();

            if (article && article.content) {
                // Create a temporary container to hold the article content
                const tempContainer = document.createElement("div");
                tempContainer.innerHTML =
                    article.content instanceof HTMLElement
                        ? article.content.innerHTML
                        : article.content;

                return {
                    title: article.title,
                    content: tempContainer,
                    textContent: article.textContent,
                };
            }
        } catch (error) {
            console.error("Error extracting article content:", error);
        }

        // Fallback to using the body if Readability fails
        return {
            title: document.title,
            content: document.body.cloneNode(true),
            textContent: document.body.textContent,
        };
    }

    /**
     * Process text into sentences and words
     * @param {string} text - The text to process
     */
    processText(text) {
        // Split text into sentences
        // This is a simple implementation and might need improvement for different languages
        this.sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

        // Clean up sentences
        this.sentences = this.sentences
            .map((sentence) => sentence.trim())
            .filter((sentence) => sentence.length > 0);

        // Reset current position
        this.currentSentenceIndex = 0;
        this.currentWordIndex = 0;

        // Process the first sentence into words
        if (this.sentences.length > 0) {
            this.processCurrentSentence();
        }
    }

    /**
     * Process the current sentence into words
     */
    processCurrentSentence() {
        if (this.currentSentenceIndex < this.sentences.length) {
            const sentence = this.sentences[this.currentSentenceIndex];
            // Split sentence into words, preserving punctuation
            this.words = sentence.match(/\S+/g) || [];
            this.currentWordIndex = 0;
        } else {
            this.words = [];
        }
    }

    /**
     * Create and inject the floating control bar
     */
    createFloatingBar() {
        // Remove existing floating bar if it exists
        if (this.floatingBar) {
            document.body.removeChild(this.floatingBar);
        }

        // Create the floating bar element
        this.floatingBar = document.createElement("div");
        this.floatingBar.id = "read-aloud-floating-bar";

        // Add drag handle
        const dragHandle = document.createElement("div");
        dragHandle.id = "read-aloud-drag-handle";
        dragHandle.innerHTML = "⋮⋮";
        this.floatingBar.appendChild(dragHandle);

        // Add play/pause button
        const playPauseBtn = document.createElement("button");
        playPauseBtn.className = "read-aloud-btn read-aloud-play-pause";
        playPauseBtn.innerHTML =
            '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
        playPauseBtn.title = "Play/Pause";
        playPauseBtn.addEventListener("click", () => this.togglePlayPause());
        this.floatingBar.appendChild(playPauseBtn);

        // Add stop button
        const stopBtn = document.createElement("button");
        stopBtn.className = "read-aloud-btn read-aloud-stop";
        stopBtn.innerHTML =
            '<svg viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg>';
        stopBtn.title = "Stop";
        stopBtn.addEventListener("click", () => this.stopReading());
        this.floatingBar.appendChild(stopBtn);

        // Add skip backward button
        const skipBackBtn = document.createElement("button");
        skipBackBtn.className = "read-aloud-btn read-aloud-skip-back";
        skipBackBtn.innerHTML =
            '<svg viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>';
        skipBackBtn.title = "Previous Sentence";
        skipBackBtn.addEventListener("click", () =>
            this.skipPreviousSentence()
        );
        this.floatingBar.appendChild(skipBackBtn);

        // Add skip forward button
        const skipForwardBtn = document.createElement("button");
        skipForwardBtn.className = "read-aloud-btn read-aloud-skip-forward";
        skipForwardBtn.innerHTML =
            '<svg viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>';
        skipForwardBtn.title = "Next Sentence";
        skipForwardBtn.addEventListener("click", () => this.skipNextSentence());
        this.floatingBar.appendChild(skipForwardBtn);

        // Add settings button
        const settingsBtn = document.createElement("button");
        settingsBtn.className = "read-aloud-btn read-aloud-settings";
        settingsBtn.innerHTML =
            '<svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>';
        settingsBtn.title = "Settings";
        settingsBtn.addEventListener("click", () => this.toggleSettings());
        this.floatingBar.appendChild(settingsBtn);

        // Make the floating bar draggable
        this.makeDraggable(this.floatingBar, dragHandle);

        // Add the floating bar to the page
        document.body.appendChild(this.floatingBar);

        // Create settings panel
        this.createSettingsPanel();

        // Auto-hide the floating bar after a delay
        this.setupAutoHide();
    }

    /**
     * Create and inject the settings panel
     */
    createSettingsPanel() {
        // Remove existing settings panel if it exists
        if (this.settingsPanel) {
            document.body.removeChild(this.settingsPanel);
        }

        // Create the settings panel element
        this.settingsPanel = document.createElement("div");
        this.settingsPanel.id = "read-aloud-settings-panel";

        // Add close button
        const closeBtn = document.createElement("button");
        closeBtn.className = "read-aloud-close-btn";
        closeBtn.innerHTML = "×";
        closeBtn.addEventListener("click", () => this.toggleSettings(false));
        this.settingsPanel.appendChild(closeBtn);

        // Add rate control
        const rateGroup = document.createElement("div");
        rateGroup.className = "read-aloud-settings-group";

        const rateLabel = document.createElement("label");
        rateLabel.className = "read-aloud-settings-label";
        rateLabel.textContent = "Rate";
        rateGroup.appendChild(rateLabel);

        const rateInput = document.createElement("input");
        rateInput.type = "range";
        rateInput.min = "0.5";
        rateInput.max = "2";
        rateInput.step = "0.1";
        rateInput.value = this.settings.speechRate.toString();
        rateInput.className = "read-aloud-range read-aloud-settings-control";
        rateInput.addEventListener("input", (e) => {
            const value = parseFloat(e.target.value);
            this.settings.speechRate = value;
            rateValue.textContent = value.toFixed(1);
            this.updateSettings();
        });
        rateGroup.appendChild(rateInput);

        const rateValue = document.createElement("div");
        rateValue.className = "read-aloud-settings-value";
        rateValue.textContent = this.settings.speechRate.toFixed(1);
        rateGroup.appendChild(rateValue);

        this.settingsPanel.appendChild(rateGroup);

        // Add pitch control
        const pitchGroup = document.createElement("div");
        pitchGroup.className = "read-aloud-settings-group";

        const pitchLabel = document.createElement("label");
        pitchLabel.className = "read-aloud-settings-label";
        pitchLabel.textContent = "Pitch";
        pitchGroup.appendChild(pitchLabel);

        const pitchInput = document.createElement("input");
        pitchInput.type = "range";
        pitchInput.min = "0";
        pitchInput.max = "2";
        pitchInput.step = "0.1";
        pitchInput.value = this.settings.speechPitch.toString();
        pitchInput.className = "read-aloud-range read-aloud-settings-control";
        pitchInput.addEventListener("input", (e) => {
            const value = parseFloat(e.target.value);
            this.settings.speechPitch = value;
            pitchValue.textContent = value.toFixed(1);
            this.updateSettings();
        });
        pitchGroup.appendChild(pitchInput);

        const pitchValue = document.createElement("div");
        pitchValue.className = "read-aloud-settings-value";
        pitchValue.textContent = this.settings.speechPitch.toFixed(1);
        pitchGroup.appendChild(pitchValue);

        this.settingsPanel.appendChild(pitchGroup);

        // Add volume control
        const volumeGroup = document.createElement("div");
        volumeGroup.className = "read-aloud-settings-group";

        const volumeLabel = document.createElement("label");
        volumeLabel.className = "read-aloud-settings-label";
        volumeLabel.textContent = "Volume";
        volumeGroup.appendChild(volumeLabel);

        const volumeInput = document.createElement("input");
        volumeInput.type = "range";
        volumeInput.min = "0";
        volumeInput.max = "1";
        volumeInput.step = "0.1";
        volumeInput.value = this.settings.playbackVolume.toString();
        volumeInput.className = "read-aloud-range read-aloud-settings-control";
        volumeInput.addEventListener("input", (e) => {
            const value = parseFloat(e.target.value);
            this.settings.playbackVolume = value;
            volumeValue.textContent = value.toFixed(1);
            this.updateSettings();
        });
        volumeGroup.appendChild(volumeInput);

        const volumeValue = document.createElement("div");
        volumeValue.className = "read-aloud-settings-value";
        volumeValue.textContent = this.settings.playbackVolume.toFixed(1);
        volumeGroup.appendChild(volumeValue);

        this.settingsPanel.appendChild(volumeGroup);

        // Add voice selection
        const voiceGroup = document.createElement("div");
        voiceGroup.className = "read-aloud-settings-group";

        const voiceLabel = document.createElement("label");
        voiceLabel.className = "read-aloud-settings-label";
        voiceLabel.textContent = "Voice";
        voiceGroup.appendChild(voiceLabel);

        const voiceSelect = document.createElement("select");
        voiceSelect.className = "read-aloud-select read-aloud-settings-control";

        // Add available voices to the select element
        this.voices.forEach((voice) => {
            const option = document.createElement("option");
            option.value = voice.voiceURI;
            option.textContent = `${voice.name} (${voice.lang})`;
            if (voice.default) {
                option.textContent += " — DEFAULT";
            }
            if (voice.voiceURI === this.settings.selectedVoiceURI) {
                option.selected = true;
            }
            voiceSelect.appendChild(option);
        });

        voiceSelect.addEventListener("change", (e) => {
            this.settings.selectedVoiceURI = e.target.value;
            this.updateSettings();
        });

        voiceGroup.appendChild(voiceSelect);
        this.settingsPanel.appendChild(voiceGroup);

        // Add the settings panel to the page
        document.body.appendChild(this.settingsPanel);
    }

    /**
     * Make an element draggable
     * @param {HTMLElement} element - The element to make draggable
     * @param {HTMLElement} handle - The handle element for dragging
     */
    makeDraggable(element, handle) {
        let pos1 = 0,
            pos2 = 0,
            pos3 = 0,
            pos4 = 0;

        handle.onmousedown = dragMouseDown;

        function dragMouseDown(e) {
            e.preventDefault();
            // Get the mouse cursor position at startup
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            // Call a function whenever the cursor moves
            document.onmousemove = elementDrag;
        }

        function elementDrag(e) {
            e.preventDefault();
            // Calculate the new cursor position
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            // Set the element's new position
            element.style.top = element.offsetTop - pos2 + "px";
            element.style.left = element.offsetLeft - pos1 + "px";
        }

        function closeDragElement() {
            // Stop moving when mouse button is released
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }

    /**
     * Set up auto-hide for the floating bar
     */
    setupAutoHide() {
        let hideTimeout;

        const showBar = () => {
            clearTimeout(hideTimeout);
            this.floatingBar.classList.remove("hidden");
        };

        const scheduleHide = () => {
            clearTimeout(hideTimeout);
            hideTimeout = setTimeout(() => {
                if (this.isReading && !this.isPaused) {
                    this.floatingBar.classList.add("hidden");
                }
            }, 3000);
        };

        // Show the bar when the mouse moves
        document.addEventListener("mousemove", showBar);

        // Schedule hiding the bar when the mouse stops moving
        document.addEventListener("mousemove", scheduleHide);

        // Show the bar when it's hovered
        this.floatingBar.addEventListener("mouseenter", showBar);

        // Don't hide the bar while it's being hovered
        this.floatingBar.addEventListener("mouseleave", scheduleHide);

        // Initial hide after delay
        scheduleHide();
    }

    /**
     * Start reading the article content
     */
    startReading() {
        // Stop any ongoing reading
        this.stopReading();

        // Extract article content
        this.articleContent = this.extractArticleContent();

        // Process the text
        this.processText(this.articleContent.textContent);

        // Create the floating bar
        this.createFloatingBar();

        // Start reading if there's content
        if (this.sentences.length > 0) {
            this.isReading = true;
            this.isPaused = false;
            this.speakCurrentSentence();
            this.updateFloatingBarState();
        } else {
            console.error("No content to read");
        }
    }

    /**
     * Read selected text
     * @param {string} text - The text to read
     */
    readSelectedText(text) {
        // Stop any ongoing reading
        this.stopReading();

        // Process the selected text
        this.processText(text);

        // Create the floating bar
        this.createFloatingBar();

        // Start reading if there's content
        if (this.sentences.length > 0) {
            this.isReading = true;
            this.isPaused = false;
            this.speakCurrentSentence();
            this.updateFloatingBarState();
        } else {
            console.error("No content to read");
        }
    }

    /**
     * Read from the clicked position
     */
    readFromHere() {
        // Get the element that was clicked
        const clickedElement = document.activeElement || document.body;

        // Extract text from the clicked element and all following siblings
        let text = "";
        let currentElement = clickedElement;

        while (currentElement) {
            if (
                currentElement.textContent &&
                currentElement.textContent.trim().length > 0
            ) {
                text += currentElement.textContent + " ";
            }
            currentElement = this.getNextElement(currentElement);
        }

        // Read the extracted text
        this.readSelectedText(text);
    }

    /**
     * Get the next element in the DOM tree (depth-first traversal)
     * @param {HTMLElement} element - The current element
     * @returns {HTMLElement} The next element
     */
    getNextElement(element) {
        // First, try to get the first child
        if (
            element.firstChild &&
            element.firstChild.nodeType === Node.ELEMENT_NODE
        ) {
            return element.firstChild;
        }

        // If no children, try to get the next sibling
        if (element.nextSibling) {
            return element.nextSibling;
        }

        // If no next sibling, go up the tree and find the next sibling of an ancestor
        let parent = element.parentNode;
        while (parent && parent !== document.body) {
            if (parent.nextSibling) {
                return parent.nextSibling;
            }
            parent = parent.parentNode;
        }

        return null;
    }

    /**
     * Stop reading
     */
    stopReading() {
        // Cancel any ongoing speech
        this.synth.cancel();

        // Reset state
        this.isReading = false;
        this.isPaused = false;
        this.currentSentenceIndex = 0;
        this.currentWordIndex = 0;

        // Remove highlighting
        this.removeHighlighting();

        // Update UI
        this.updateFloatingBarState();

        // Remove floating bar if it exists
        if (this.floatingBar) {
            document.body.removeChild(this.floatingBar);
            this.floatingBar = null;
        }

        // Remove settings panel if it exists
        if (this.settingsPanel) {
            document.body.removeChild(this.settingsPanel);
            this.settingsPanel = null;
        }
    }

    /**
     * Toggle play/pause
     */
    togglePlayPause() {
        if (this.isPaused) {
            // Resume reading
            this.isPaused = false;
            this.speakCurrentSentence();
        } else {
            // Pause reading
            this.isPaused = true;
            this.synth.pause();
        }

        this.updateFloatingBarState();
    }

    /**
     * Skip to the next sentence
     */
    skipNextSentence() {
        // Cancel current speech
        this.synth.cancel();

        // Remove current highlighting
        this.removeHighlighting();

        // Move to the next sentence
        this.currentSentenceIndex++;

        // Check if we've reached the end
        if (this.currentSentenceIndex >= this.sentences.length) {
            this.stopReading();
            return;
        }

        // Process the new sentence
        this.processCurrentSentence();

        // Speak the new sentence
        if (this.isReading && !this.isPaused) {
            this.speakCurrentSentence();
        }
    }

    /**
     * Skip to the previous sentence
     */
    skipPreviousSentence() {
        // Cancel current speech
        this.synth.cancel();

        // Remove current highlighting
        this.removeHighlighting();

        // Move to the previous sentence
        this.currentSentenceIndex = Math.max(0, this.currentSentenceIndex - 1);

        // Process the new sentence
        this.processCurrentSentence();

        // Speak the new sentence
        if (this.isReading && !this.isPaused) {
            this.speakCurrentSentence();
        }
    }

    /**
     * Speak the current sentence
     */
    speakCurrentSentence() {
        if (this.currentSentenceIndex >= this.sentences.length) {
            this.stopReading();
            return;
        }

        const sentence = this.sentences[this.currentSentenceIndex];

        // Create a new utterance
        this.utterance = new SpeechSynthesisUtterance(sentence);

        // Set utterance properties
        this.utterance.rate = this.settings.speechRate;
        this.utterance.pitch = this.settings.speechPitch;
        this.utterance.volume = this.settings.playbackVolume;

        // Set the voice if one is selected
        if (this.settings.selectedVoiceURI) {
            const selectedVoice = this.voices.find(
                (voice) => voice.voiceURI === this.settings.selectedVoiceURI
            );
            if (selectedVoice) {
                this.utterance.voice = selectedVoice;
            }
        }

        // Set up event handlers
        this.utterance.onboundary = (event) => this.handleBoundary(event);
        this.utterance.onend = () => this.handleUtteranceEnd();
        this.utterance.onerror = (event) => this.handleUtteranceError(event);

        // Start speaking
        this.synth.speak(this.utterance);

        // Create word elements for highlighting
        this.createWordElements();
    }

    /**
     * Create word elements for highlighting
     */
    createWordElements() {
        // Clear any existing word elements
        this.wordElements = [];

        // Create a span for each word
        this.words.forEach((word) => {
            const wordElement = document.createElement("span");
            wordElement.textContent = word;
            wordElement.className = "read-aloud-word";
            this.wordElements.push(wordElement);
        });
    }

    /**
     * Handle speech boundary event (word boundary)
     * @param {SpeechSynthesisEvent} event - The boundary event
     */
    handleBoundary(event) {
        // Check if it's a word boundary
        if (event.name === "word") {
            // Calculate the word index based on the character index
            let wordIndex = 0;
            let charCount = 0;

            for (let i = 0; i < this.words.length; i++) {
                charCount += this.words[i].length + 1; // +1 for the space
                if (charCount > event.charIndex) {
                    wordIndex = i;
                    break;
                }
            }

            // Update the current word index
            this.currentWordIndex = wordIndex;

            // Update highlighting
            this.updateHighlighting();
        }
    }

    /**
     * Handle utterance end event
     */
    handleUtteranceEnd() {
        // Move to the next sentence
        this.currentSentenceIndex++;

        // Remove highlighting
        this.removeHighlighting();

        // Check if we've reached the end
        if (this.currentSentenceIndex >= this.sentences.length) {
            this.stopReading();
            return;
        }

        // Process the next sentence
        this.processCurrentSentence();

        // Speak the next sentence if still reading
        if (this.isReading && !this.isPaused) {
            this.speakCurrentSentence();
        }
    }

    /**
     * Handle utterance error event
     * @param {SpeechSynthesisErrorEvent} event - The error event
     */
    handleUtteranceError(event) {
        console.error("Speech synthesis error:", event.error);
        this.stopReading();
    }

    /**
     * Update word highlighting
     */
    updateHighlighting() {
        // Remove previous highlighting
        this.removeHighlighting();

        // Highlight the current word
        if (
            this.currentWordIndex >= 0 &&
            this.currentWordIndex < this.wordElements.length
        ) {
            const wordElement = this.wordElements[this.currentWordIndex];
            wordElement.classList.add("read-aloud-highlighted");

            // Find all instances of this word in the document and highlight them
            const word = this.words[this.currentWordIndex];
            const textNodes = this.getTextNodesIn(document.body);

            for (const node of textNodes) {
                const text = node.nodeValue;
                const wordRegex = new RegExp(
                    `\\b${this.escapeRegExp(word)}\\b`,
                    "gi"
                );
                let match;

                while ((match = wordRegex.exec(text)) !== null) {
                    const range = document.createRange();
                    range.setStart(node, match.index);
                    range.setEnd(node, match.index + word.length);

                    const span = document.createElement("span");
                    span.className = "read-aloud-highlighted";
                    range.surroundContents(span);

                    // Update the text node reference since it's been split
                    break; // Only highlight the first occurrence to avoid issues with DOM changes
                }
            }
        }
    }

    /**
     * Remove all highlighting
     */
    removeHighlighting() {
        const highlightedElements = document.querySelectorAll(
            ".read-aloud-highlighted"
        );
        highlightedElements.forEach((element) => {
            // If it's a span we created, replace it with its text content
            if (element.tagName === "SPAN") {
                const textNode = document.createTextNode(element.textContent);
                element.parentNode.replaceChild(textNode, element);
            } else {
                // Otherwise just remove the class
                element.classList.remove("read-aloud-highlighted");
            }
        });
    }

    /**
     * Get all text nodes within an element
     * @param {HTMLElement} element - The element to search within
     * @returns {Node[]} Array of text nodes
     */
    getTextNodesIn(element) {
        const textNodes = [];
        const walk = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        let node;

        while ((node = walk.nextNode())) {
            // Skip empty text nodes and nodes in hidden elements
            if (
                node.nodeValue.trim() !== "" &&
                !this.isElementHidden(node.parentElement)
            ) {
                textNodes.push(node);
            }
        }

        return textNodes;
    }

    /**
     * Check if an element is hidden
     * @param {HTMLElement} element - The element to check
     * @returns {boolean} True if the element is hidden
     */
    isElementHidden(element) {
        if (!element) return false;

        const style = window.getComputedStyle(element);
        return (
            style.display === "none" ||
            style.visibility === "hidden" ||
            style.opacity === "0" ||
            element.offsetHeight === 0
        );
    }

    /**
     * Escape special characters for use in a regular expression
     * @param {string} string - The string to escape
     * @returns {string} The escaped string
     */
    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    /**
     * Update the floating bar state based on the current reading state
     */
    updateFloatingBarState() {
        if (!this.floatingBar) return;

        const playPauseBtn = this.floatingBar.querySelector(
            ".read-aloud-play-pause"
        );
        if (playPauseBtn) {
            if (this.isPaused) {
                playPauseBtn.innerHTML =
                    '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
                playPauseBtn.title = "Play";
            } else {
                playPauseBtn.innerHTML =
                    '<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
                playPauseBtn.title = "Pause";
            }
        }
    }

    /**
     * Toggle the settings panel
     * @param {boolean} [show] - Whether to show or hide the panel
     */
    toggleSettings(show) {
        if (!this.settingsPanel) return;

        if (show === undefined) {
            // Toggle based on current state
            this.settingsPanel.classList.toggle("visible");
        } else if (show) {
            // Show the panel
            this.settingsPanel.classList.add("visible");
        } else {
            // Hide the panel
            this.settingsPanel.classList.remove("visible");
        }
    }

    /**
     * Update settings and save to storage
     */
    updateSettings() {
        // Update the current utterance if there is one
        if (this.utterance) {
            this.utterance.rate = this.settings.speechRate;
            this.utterance.pitch = this.settings.speechPitch;
            this.utterance.volume = this.settings.playbackVolume;

            if (this.settings.selectedVoiceURI) {
                const selectedVoice = this.voices.find(
                    (voice) => voice.voiceURI === this.settings.selectedVoiceURI
                );
                if (selectedVoice) {
                    this.utterance.voice = selectedVoice;
                }
            }
        }

        // Save settings to storage
        chrome.storage.sync.set({
            speechRate: this.settings.speechRate,
            speechPitch: this.settings.speechPitch,
            selectedVoiceURI: this.settings.selectedVoiceURI,
            playbackVolume: this.settings.playbackVolume,
        });
    }
}

// Initialize the Read Aloud Pro functionality
const readAloudPro = new ReadAloudPro();

// Log initialization
console.log("Read Aloud Pro extension initialized");
