/**
 * Settings page script for Read Aloud Pro extension
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM elements
  const rateInput = document.getElementById('rate');
  const pitchInput = document.getElementById('pitch');
  const volumeInput = document.getElementById('volume');
  const voiceSelect = document.getElementById('voice');
  const rateValue = document.getElementById('rate-value');
  const pitchValue = document.getElementById('pitch-value');
  const volumeValue = document.getElementById('volume-value');
  const saveSettingsBtn = document.getElementById('save-settings');
  const resetSettingsBtn = document.getElementById('reset-settings');
  
  // Default settings
  const defaultSettings = {
    speechRate: 1.0,
    speechPitch: 1.0,
    selectedVoiceURI: '',
    playbackVolume: 1.0
  };
  
  // Current settings
  let settings = { ...defaultSettings };
  
  // Initialize speech synthesis to get available voices
  const synth = window.speechSynthesis;
  let voices = [];
  
  // Load settings from storage
  loadSettings();
  
  // Get available voices
  function loadVoices() {
    voices = synth.getVoices();
    populateVoiceSelect();
  }
  
  // Chrome loads voices asynchronously
  if (synth.onvoiceschanged !== undefined) {
    synth.onvoiceschanged = loadVoices;
  }
  
  // Initial load of voices
  loadVoices();
  
  // Populate voice select dropdown
  function populateVoiceSelect() {
    // Clear existing options
    voiceSelect.innerHTML = '';
    
    // Group voices by language
    const voicesByLang = {};
    
    voices.forEach(voice => {
      if (!voicesByLang[voice.lang]) {
        voicesByLang[voice.lang] = [];
      }
      voicesByLang[voice.lang].push(voice);
    });
    
    // Sort languages
    const sortedLangs = Object.keys(voicesByLang).sort();
    
    // Create option groups for each language
    sortedLangs.forEach(lang => {
      const optgroup = document.createElement('optgroup');
      optgroup.label = lang;
      
      // Add voices to the option group
      voicesByLang[lang].forEach(voice => {
        const option = document.createElement('option');
        option.value = voice.voiceURI;
        option.textContent = voice.name;
        
        if (voice.default) {
          option.textContent += ' (Default)';
        }
        
        if (voice.voiceURI === settings.selectedVoiceURI) {
          option.selected = true;
        }
        
        optgroup.appendChild(option);
      });
      
      voiceSelect.appendChild(optgroup);
    });
    
    // If no voice is selected, select the default
    if (!settings.selectedVoiceURI && voices.length > 0) {
      const defaultVoice = voices.find(voice => voice.default) || voices[0];
      settings.selectedVoiceURI = defaultVoice.voiceURI;
      updateUIFromSettings();
    }
  }
  
  // Load settings from storage
  function loadSettings() {
    chrome.storage.sync.get(
      ['speechRate', 'speechPitch', 'selectedVoiceURI', 'playbackVolume'],
      result => {
        if (result.speechRate !== undefined) {
          settings.speechRate = result.speechRate;
        }
        
        if (result.speechPitch !== undefined) {
          settings.speechPitch = result.speechPitch;
        }
        
        if (result.selectedVoiceURI !== undefined) {
          settings.selectedVoiceURI = result.selectedVoiceURI;
        }
        
        if (result.playbackVolume !== undefined) {
          settings.playbackVolume = result.playbackVolume;
        }
        
        updateUIFromSettings();
      }
    );
  }
  
  // Update UI controls from settings
  function updateUIFromSettings() {
    rateInput.value = settings.speechRate;
    rateValue.textContent = settings.speechRate.toFixed(1);
    
    pitchInput.value = settings.speechPitch;
    pitchValue.textContent = settings.speechPitch.toFixed(1);
    
    volumeInput.value = settings.playbackVolume;
    volumeValue.textContent = settings.playbackVolume.toFixed(1);
    
    // Voice select is updated when voices are loaded
  }
  
  // Save settings to storage
  function saveSettings() {
    chrome.storage.sync.set({
      speechRate: settings.speechRate,
      speechPitch: settings.speechPitch,
      selectedVoiceURI: settings.selectedVoiceURI,
      playbackVolume: settings.playbackVolume
    }, () => {
      // Show saved message
      showSavedMessage();
    });
  }
  
  // Reset settings to defaults
  function resetSettings() {
    settings = { ...defaultSettings };
    
    // If voices are loaded, select a default voice
    if (voices.length > 0) {
      const defaultVoice = voices.find(voice => voice.default) || voices[0];
      settings.selectedVoiceURI = defaultVoice.voiceURI;
    }
    
    updateUIFromSettings();
    saveSettings();
  }
  
  // Show saved message
  function showSavedMessage() {
    const message = document.createElement('div');
    message.className = 'saved-message';
    message.textContent = 'Settings saved!';
    
    document.body.appendChild(message);
    
    // Fade in
    setTimeout(() => {
      message.style.opacity = '1';
    }, 10);
    
    // Fade out and remove
    setTimeout(() => {
      message.style.opacity = '0';
      setTimeout(() => {
        document.body.removeChild(message);
      }, 500);
    }, 2000);
  }
  
  // Event listeners for settings controls
  rateInput.addEventListener('input', () => {
    settings.speechRate = parseFloat(rateInput.value);
    rateValue.textContent = settings.speechRate.toFixed(1);
  });
  
  pitchInput.addEventListener('input', () => {
    settings.speechPitch = parseFloat(pitchInput.value);
    pitchValue.textContent = settings.speechPitch.toFixed(1);
  });
  
  volumeInput.addEventListener('input', () => {
    settings.playbackVolume = parseFloat(volumeInput.value);
    volumeValue.textContent = settings.playbackVolume.toFixed(1);
  });
  
  voiceSelect.addEventListener('change', () => {
    settings.selectedVoiceURI = voiceSelect.value;
  });
  
  // Save settings button
  saveSettingsBtn.addEventListener('click', () => {
    saveSettings();
  });
  
  // Reset settings button
  resetSettingsBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      resetSettings();
    }
  });
  
  // Add CSS for the saved message
  const style = document.createElement('style');
  style.textContent = `
    .saved-message {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background-color: #4285f4;
      color: white;
      padding: 10px 20px;
      border-radius: 4px;
      font-weight: 500;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
      opacity: 0;
      transition: opacity 0.3s ease-in-out;
    }
  `;
  document.head.appendChild(style);
});
