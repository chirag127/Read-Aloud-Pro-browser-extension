/**
 * Popup script for Read Aloud Pro extension
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM elements
  const startReadingBtn = document.getElementById('start-reading');
  const stopReadingBtn = document.getElementById('stop-reading');
  const rateInput = document.getElementById('rate');
  const pitchInput = document.getElementById('pitch');
  const volumeInput = document.getElementById('volume');
  const voiceSelect = document.getElementById('voice');
  const rateValue = document.getElementById('rate-value');
  const pitchValue = document.getElementById('pitch-value');
  const volumeValue = document.getElementById('volume-value');
  
  // Settings
  let settings = {
    speechRate: 1.0,
    speechPitch: 1.0,
    selectedVoiceURI: '',
    playbackVolume: 1.0
  };
  
  // Load settings from storage
  loadSettings();
  
  // Initialize speech synthesis to get available voices
  const synth = window.speechSynthesis;
  let voices = [];
  
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
    
    // Add voices to select
    voices.forEach(voice => {
      const option = document.createElement('option');
      option.value = voice.voiceURI;
      option.textContent = `${voice.name} (${voice.lang})`;
      
      if (voice.default) {
        option.textContent += ' — DEFAULT';
      }
      
      if (voice.voiceURI === settings.selectedVoiceURI) {
        option.selected = true;
      }
      
      voiceSelect.appendChild(option);
    });
    
    // If no voice is selected, select the default
    if (!settings.selectedVoiceURI && voices.length > 0) {
      const defaultVoice = voices.find(voice => voice.default) || voices[0];
      settings.selectedVoiceURI = defaultVoice.voiceURI;
      saveSettings();
    }
  }
  
  // Load settings from storage
  function loadSettings() {
    chrome.storage.sync.get(
      ['speechRate', 'speechPitch', 'selectedVoiceURI', 'playbackVolume'],
      result => {
        if (result.speechRate !== undefined) {
          settings.speechRate = result.speechRate;
          rateInput.value = settings.speechRate;
          rateValue.textContent = settings.speechRate.toFixed(1);
        }
        
        if (result.speechPitch !== undefined) {
          settings.speechPitch = result.speechPitch;
          pitchInput.value = settings.speechPitch;
          pitchValue.textContent = settings.speechPitch.toFixed(1);
        }
        
        if (result.selectedVoiceURI !== undefined) {
          settings.selectedVoiceURI = result.selectedVoiceURI;
          // Voice select is populated after voices are loaded
        }
        
        if (result.playbackVolume !== undefined) {
          settings.playbackVolume = result.playbackVolume;
          volumeInput.value = settings.playbackVolume;
          volumeValue.textContent = settings.playbackVolume.toFixed(1);
        }
      }
    );
  }
  
  // Save settings to storage
  function saveSettings() {
    chrome.storage.sync.set({
      speechRate: settings.speechRate,
      speechPitch: settings.speechPitch,
      selectedVoiceURI: settings.selectedVoiceURI,
      playbackVolume: settings.playbackVolume
    });
    
    // Send settings to content script
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'updateSettings',
          settings: settings
        });
      }
    });
  }
  
  // Event listeners for settings controls
  rateInput.addEventListener('input', () => {
    settings.speechRate = parseFloat(rateInput.value);
    rateValue.textContent = settings.speechRate.toFixed(1);
    saveSettings();
  });
  
  pitchInput.addEventListener('input', () => {
    settings.speechPitch = parseFloat(pitchInput.value);
    pitchValue.textContent = settings.speechPitch.toFixed(1);
    saveSettings();
  });
  
  volumeInput.addEventListener('input', () => {
    settings.playbackVolume = parseFloat(volumeInput.value);
    volumeValue.textContent = settings.playbackVolume.toFixed(1);
    saveSettings();
  });
  
  voiceSelect.addEventListener('change', () => {
    settings.selectedVoiceURI = voiceSelect.value;
    saveSettings();
  });
  
  // Start reading button
  startReadingBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'startReading' });
    window.close(); // Close the popup
  });
  
  // Stop reading button
  stopReadingBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'stopReading' });
    window.close(); // Close the popup
  });
});
