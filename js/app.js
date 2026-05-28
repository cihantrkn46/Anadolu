import { sanitizeApiKey, sanitizeInput } from './utils/sanitize.js';
import { getProxyBaseUrl, setProxyBaseUrl, usesProxy } from './config.js';
import { initIndexedDB, saveHistoryToDB, loadHistoryFromDB, clearHistoryDB } from './services/storage.js';
import { loadOfflineQueue, pushOfflineMessage, shiftOfflineMessage, saveOfflineQueue } from './services/offlineQueue.js';
import { streamGemini } from './services/gemini.js';
import {
  createUserMessage,
  createAiMessageShell,
  setAiContent,
  createAiMessageFromHistory,
  createDateSep,
} from './dom/messageRenderer.js';
import { createVirtualList } from './dom/virtualList.js';
import { createThemeController } from './features/theme.js';
import { initPwa, registerServiceWorker, activateWaitingWorker } from './features/pwa.js';
import { createSpeech } from './features/speech.js';
import { createModalController } from './features/modal.js';
import { initViewport } from './features/viewport.js';
import { extractMessageText, copyText } from './utils/helpers.js';

const MAX_CHARS = 2000;
const MAX_DOM_MESSAGES = 120;

export async function initApp() {
  const $ = (id) => document.getElementById(id);

  const chatArea = $('chatArea');
  const userInput = $('userInput');
  const typingIndicator = $('typingIndicator');
  const sendBtn = $('sendBtn');
  const welcomeScreen = $('welcomeScreen');
  const welcomeTitle = $('welcomeTitle');
  const toast = $('toast');
  const assistantSvg = $('assistantSvg');
  const statusText = $('statusText');
  const statusDot = $('statusDot');
  const scrollFab = $('scrollFab');
  const wordCountEl = $('wordCount');
  const dynChipsEl = $('dynChips');
  const netBar = $('netBar');
  const settingsModal = $('settingsModal');
  const apiKeyInput = $('apiKeyInput');
  const userNameInput = $('userNameInput');
  const modelSelect = $('modelSelect');
  const modelBadge = $('modelBadge');
  const settingsToggle = $('settingsToggle');
  const saveSettingsBtn = $('saveSettingsBtn');
  const closeSettingsBtn = $('closeSettingsBtn');
  const clearBtn = $('clearBtn');
  const assistantBubble = $('assistantBubble');
  const tefekkurBtn = $('tefekkurBtn');
  const fileInput = $('fileInput');
  const imgPreviewContainer = $('imgPreviewContainer');
  const proxyUrlInput = $('proxyUrlInput');
  const apiKeyField = $('apiKeyField');
  const updateBar = $('updateBar');
  const updateReloadBtn = $('updateReloadBtn');
  const updateDismissBtn = $('updateDismissBtn');
  const bottomSection = $('bottomSection');
  const chatWrapper = document.querySelector('.chat-wrapper');

  const chatSpacerTop = $('chatSpacerTop');
  const chatMessages = $('chatMessages');
  const chatSpacerBottom = $('chatSpacerBottom');

  if (!chatArea || !userInput || !sendBtn || !typingIndicator) {
    console.error('Anadolu: gerekli arayüz öğeleri yüklenemedi.');
    return;
  }

  let conversationHistory = [];
  let offlineQueue = loadOfflineQueue();
  let isStreaming = false;
  let welcomeVisible = true;
  let abortController = null;
  let autoScroll = true;
  let bubbleTimer = null;
  let toastTimer = null;
  let tefekkurMode = false;
  let attachedImages = [];

  const virtualList = createVirtualList({
    scrollEl: chatArea,
    mountEl: chatMessages,
    spacerTopEl: chatSpacerTop,
    spacerBottomEl: chatSpacerBottom,
  });

  function haptic() {
    navigator.vibrate?.(12);
  }

  function showToast(msg) {
    clearTimeout(toastTimer);
    toast.textContent = msg;
    toast.classList.add('show');
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
  }

  const theme = createThemeController({
    themeBtn: $('themeBtn'),
    metaThemeColor: $('meta-theme-color'),
    onChange: (t) =>
      showToast(t === 'light' ? 'Gündüz moduna geçildi' : 'Gece moduna geçildi'),
  });

  const speech = createSpeech({
    micBtn: $('micBtn'),
    userInput,
    assistantSvg,
    showToast,
  });
  speech.bindTts($('ttsBtn'));

  function showBubble(text) {
    clearTimeout(bubbleTimer);
    assistantBubble.textContent = text;
    assistantBubble.classList.add('show');
    bubbleTimer = setTimeout(() => assistantBubble.classList.remove('show'), 3500);
  }

  function setStatus(text, active) {
    statusText.textContent = text;
    statusDot.classList.toggle('is-active', !!active);
  }

  function scrollToBottom(instant = false) {
    if (!autoScroll) return;
    requestAnimationFrame(() => {
      chatArea.scrollTo({
        top: chatArea.scrollHeight,
        behavior: instant ? 'auto' : 'auto',
      });
    });
  }

  chatArea.addEventListener(
    'scroll',
    () => {
      const diff = chatArea.scrollHeight - chatArea.scrollTop - chatArea.clientHeight;
      autoScroll = diff < 80;
      scrollFab?.classList.toggle('show', diff > 200);
    },
    { passive: true },
  );

  scrollFab?.addEventListener('click', () => {
    autoScroll = true;
    scrollToBottom(true);
  });

  function hideWelcome() {
    if (!welcomeVisible) return;
    welcomeScreen.style.opacity = '0';
    welcomeScreen.style.transform = 'scale(0.98)';
    welcomeScreen.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    setTimeout(() => {
      welcomeScreen.style.display = 'none';
    }, 300);
    welcomeVisible = false;
  }

  function trimDomMessages() {
    const items = virtualList.items;
    if (items.length <= MAX_DOM_MESSAGES) return;
    virtualList.setItems(items.slice(-MAX_DOM_MESSAGES));
  }

  function insertAux(el) {
    if (typingIndicator?.parentElement) {
      typingIndicator.parentElement.insertBefore(el, typingIndicator);
    } else {
      chatArea.appendChild(el);
    }
    scrollToBottom(true);
  }

  function canSubmit(text) {
    const len = text.length;
    return (len > 0 || attachedImages.length > 0) && len <= MAX_CHARS;
  }

  function updateSendState() {
    if (!sendBtn || isStreaming) return;
    sendBtn.disabled = !canSubmit(userInput.value.trim());
  }

  function resetStreamingUi() {
    isStreaming = false;
    typingIndicator.style.display = 'none';
    assistantSvg?.classList.remove('speaking');
    sendBtn.classList.remove('stop');
    sendBtn.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z"/></svg>';
    sendBtn.title = 'Gönder';
    abortController = null;
    updateSendState();
  }

  function insertBeforeTyping(node) {
    virtualList.append(node);
    trimDomMessages();
    scrollToBottom(true);
  }

  function loadSettings() {
    const key = localStorage.getItem('anadoluApiKey');
    if (key && apiKeyInput) apiKeyInput.value = key;
    const name = localStorage.getItem('anadoluUserName');
    if (name && userNameInput) userNameInput.value = name;
    const savedModel = localStorage.getItem('anadoluModel') || 'gemini-2.5-flash';
    if (modelSelect) modelSelect.value = savedModel;
    if (proxyUrlInput) proxyUrlInput.value = getProxyBaseUrl();
    syncApiKeyFieldVisibility();
    updateModelBadge();
    if (welcomeTitle && name) welcomeTitle.textContent = `Hoş Geldin ${name}`;
  }

  function updateModelBadge() {
    if (!modelBadge) return;
    const m = localStorage.getItem('anadoluModel') || 'gemini-2.5-flash';
    const map = {
      'gemini-2.5-flash': '2.5 Flash',
      'gemini-2.5-pro': '2.5 Pro',
      'gemini-2.0-flash': '2.0 Flash',
      'gemini-1.5-flash': '1.5 Flash',
      'gemini-1.5-pro': '1.5 Pro',
    };
    modelBadge.textContent = map[m] || '2.5 Flash';
  }

  function syncApiKeyFieldVisibility() {
    const proxyOn = usesProxy();
    apiKeyField?.classList.toggle('is-hidden', proxyOn);
    if (apiKeyInput) {
      apiKeyInput.required = !proxyOn;
      apiKeyInput.placeholder = proxyOn ? 'Proxy kullanılıyor (isteğe bağlı)' : 'AIzaSy...';
    }
  }

  proxyUrlInput?.addEventListener('input', syncApiKeyFieldVisibility);

  function openSettings() {
    settingsModal?.classList.add('active');
    document.body.classList.add('modal-open');
    settingsToggle?.classList.remove('settings-highlight');
    apiKeyInput?.focus();
  }

  function closeSettings() {
    settingsModal?.classList.remove('active');
    document.body.classList.remove('modal-open');
  }

  function saveSettings() {
    const rawKey = apiKeyInput?.value.trim() || '';
    const key = sanitizeApiKey(rawKey);
    if (apiKeyInput && key !== rawKey) apiKeyInput.value = key;
    localStorage.setItem('anadoluApiKey', key);

    const safeName = sanitizeInput(userNameInput?.value.trim() || '');
    if (userNameInput && safeName !== userNameInput.value) userNameInput.value = safeName;
    localStorage.setItem('anadoluUserName', safeName);

    if (modelSelect) localStorage.setItem('anadoluModel', modelSelect.value);
    if (proxyUrlInput) setProxyBaseUrl(proxyUrlInput.value);
    syncApiKeyFieldVisibility();
    if (welcomeTitle) {
      welcomeTitle.textContent = safeName ? `Hoş Geldin ${safeName}` : 'Hoş Geldin Yoldaşım';
    }
    updateModelBadge();
    closeSettings();
    showToast('Ayarlar mühürlendi');
  }

  async function restoreChatHistory() {
    const saved = await loadHistoryFromDB();
    if (!saved?.length) return;

    conversationHistory = saved;
    hideWelcome();
    const nodes = [];

    saved.forEach((msg) => {
      const text = extractMessageText(msg);
      if (!text) return;
      if (msg.role === 'user') nodes.push(createUserMessage(text));
      else if (msg.role === 'model') nodes.push(createAiMessageFromHistory(text));
    });

    if (nodes.length) {
      nodes.unshift(createDateSep('Önceki Sohbet'));
    }
    virtualList.setItems(nodes);
    scrollToBottom(true);
  }

  function showOfflinePending() {
    offlineQueue.forEach((text) => {
      hideWelcome();
      insertBeforeTyping(createUserMessage(text, { pending: true }));
    });
  }

  function stopStream() {
    abortController?.abort();
    abortController = null;
  }

  async function callGeminiStreaming(userText, imagesOverride) {
    const apiKey = localStorage.getItem('anadoluApiKey') || '';
    const userName = localStorage.getItem('anadoluUserName') || 'Kardaşım';
    const model = localStorage.getItem('anadoluModel') || 'gemini-2.5-flash';
    const apiText = userText.trim() || 'Bu görselleri incele ve yorumla.';
    const imagesForRequest = imagesOverride ?? [...attachedImages];

    if (!apiKey && !usesProxy()) {
      showError('API anahtarı veya proxy URL gerekli. Ayarlardan yapılandır kardaşım.');
      showBubble('Anahtar lazım...');
      openSettings();
      settingsToggle?.classList.add('settings-highlight');
      return;
    }

    const userParts = [{ text: apiText }];
    imagesForRequest.forEach((img) => {
      userParts.push({ inline_data: { mime_type: img.mimeType, data: img.data } });
    });
    conversationHistory.push({ role: 'user', parts: userParts });

    typingIndicator.style.display = 'flex';
    isStreaming = true;
    autoScroll = true;
    sendBtn.disabled = false;
    assistantSvg?.classList.add('speaking');
    setStatus('Yanıt hazırlanıyor...', true);
    showBubble('Düşünüyorum...');

    sendBtn.classList.add('stop');
    sendBtn.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>';
    sendBtn.title = 'Durdur';

    abortController = new AbortController();

    const aiMsg = createAiMessageShell();
    insertBeforeTyping(aiMsg);
    typingIndicator.style.display = 'none';

    const contentEl = aiMsg.querySelector('.msg-content');
    const timeEl = aiMsg.querySelector('.msg-time');
    const cursor = document.createElement('span');
    cursor.className = 'streaming-cursor';
    cursor.setAttribute('aria-hidden', 'true');
    contentEl.appendChild(cursor);

    let fullText = '';
    let raf = 0;

    const flushStream = () => {
      raf = 0;
      setAiContent(contentEl, fullText, { streaming: true });
      contentEl.appendChild(cursor);
      scrollToBottom(true);
    };

    try {
      fullText = await streamGemini({
        apiKey,
        model,
        conversationHistory,
        userName,
        tefekkurMode,
        signal: abortController.signal,
        onChunk: (text) => {
          fullText = text;
          if (!raf) raf = requestAnimationFrame(flushStream);
        },
      });

      cursor.remove();
      setAiContent(contentEl, fullText, { streaming: false });
      if (timeEl) {
        timeEl.textContent = new Date().toLocaleTimeString('tr-TR', {
          hour: '2-digit',
          minute: '2-digit',
        });
      }

      if (fullText.trim()) {
        conversationHistory.push({ role: 'model', parts: [{ text: fullText }] });
        saveHistoryToDB(conversationHistory);
        speech.speakText(fullText);
        generateDynamicChips(apiText, fullText);
      }
      showBubble('Söyledim işte.');
      setStatus('Hazır · Dinliyorum sizi', false);
    } catch (err) {
      cursor.remove();
      if (err.name === 'AbortError') {
        if (fullText.trim()) {
          setAiContent(contentEl, fullText, { streaming: false });
          if (timeEl) {
            timeEl.textContent = new Date().toLocaleTimeString('tr-TR', {
              hour: '2-digit',
              minute: '2-digit',
            });
          }
          conversationHistory.push({ role: 'model', parts: [{ text: fullText }] });
          saveHistoryToDB(conversationHistory);
        } else {
          virtualList.remove(aiMsg);
          conversationHistory.pop();
        }
        showBubble('Eyvallah, sustum.');
        setStatus('Hazır · Dinliyorum sizi', false);
      } else {
        virtualList.remove(aiMsg);
        conversationHistory.pop();
        showError(`Bir sorun çıktı kardaşım: ${err.message}`);
        addRetry(apiText);
        showBubble('Bağlantı koptu...');
        setStatus('Hazır · Dinliyorum sizi', false);
      }
    } finally {
      resetStreamingUi();
      scrollToBottom(true);
      processOfflineQueue();
    }
  }

  function showError(msg) {
    const el = document.createElement('div');
    el.className = 'error-msg';
    el.textContent = msg;
    insertAux(el);
  }

  function addRetry(userText) {
    const retryBtn = document.createElement('button');
    retryBtn.type = 'button';
    retryBtn.className = 'retry-btn';
    retryBtn.textContent = '🔄 Yeniden Dene';
    retryBtn.addEventListener('click', () => {
      retryBtn.remove();
      chatWrapper?.querySelector('.error-msg')?.remove();
      if (!isStreaming) callGeminiStreaming(userText);
    });
    insertAux(retryBtn);
  }

  function sendMessage(forceText) {
    const text = (forceText ?? userInput.value).trim();
    if (!canSubmit(text) || isStreaming) return;

    const displayText = text || '📷 Görsel';

    hideWelcome();
    haptic();

    if (!forceText) {
      sendBtn.classList.add('pulse');
      setTimeout(() => sendBtn.classList.remove('pulse'), 500);
    }

    if (conversationHistory.length === 0 && !forceText) {
      insertBeforeTyping(
        createDateSep(
          new Date().toLocaleString('tr-TR', {
            day: 'numeric',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit',
          }),
        ),
      );
    }

    if (!navigator.onLine) {
      insertBeforeTyping(createUserMessage(displayText, { pending: true }));
      offlineQueue = pushOfflineMessage(offlineQueue, displayText);
      if (!forceText) {
        userInput.value = '';
        userInput.style.height = '';
        userInput.dispatchEvent(new Event('input'));
      }
      showToast('İnternet yok, mesaj sıraya alındı.');
      return;
    }

    const imagesSnapshot = [...attachedImages];
    insertBeforeTyping(createUserMessage(displayText));
    if (!forceText) {
      userInput.value = '';
      userInput.style.height = '';
      userInput.dispatchEvent(new Event('input'));
      attachedImages = [];
      if (imgPreviewContainer) {
        imgPreviewContainer.innerHTML = '';
        imgPreviewContainer.style.display = 'none';
      }
    }
    callGeminiStreaming(text || displayText, imagesSnapshot);
  }

  function processOfflineQueue() {
    if (!offlineQueue.length || !navigator.onLine || isStreaming) return;
    const text = offlineQueue[0];
    offlineQueue = shiftOfflineMessage(offlineQueue);
    const pending = virtualList.items.find((n) => n.classList?.contains('pending-msg'));
    if (pending) {
      pending.classList.remove('pending-msg');
      pending.classList.add('sending');
      const label = pending.querySelector('.msg-label');
      if (label) label.textContent = 'Sen dedin ki:';
      setTimeout(() => {
        pending.classList.remove('sending');
        callGeminiStreaming(text);
      }, 400);
    } else {
      sendMessage(text);
    }
    showToast('Bekleyen mesaj iletiliyor...');
  }

  function generateDynamicChips(userText, aiText) {
    if (!dynChipsEl) return;
    const lower = `${userText} ${aiText}`.toLowerCase();
    let chips;
    if (/yemek|tarif|mutfak/.test(lower)) {
      chips = ['Kahramanmaraş mutfağı 🍽️', 'Tarhana çorbası 🍲', 'Tatlı tarifleri 🍯'];
    } else if (/tarih|uygarlık|eski/.test(lower)) {
      chips = ['Germiyanoğulları 🏛️', 'Göbeklitepe ☄️', 'Sütçü İmam olayı 📜'];
    } else if (/hava|yol|şehir/.test(lower)) {
      chips = ['Maraş şivesi 🗣️', 'Kapadokya balonları 🎈', 'Yöresel kelimeler 📚'];
    } else if (/masal|hikaye|anlat/.test(lower)) {
      chips = ['Keloğlan Masalı 📖', 'Dede Korkut Hikayeleri ⚔️', 'Nasreddin Hoca Fıkrası 😂'];
    } else {
      chips = ['Bana bir şiir oku ✍️', 'Bir fıkra anlat de hele ☕', 'Yedi Güzel Adam 🏛️'];
    }
    dynChipsEl.replaceChildren(
      ...chips.map((label) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'dyn-chip';
        btn.textContent = label;
        btn.addEventListener('click', () => {
          userInput.value = label;
          sendMessage();
        });
        return btn;
      }),
    );
  }

  chatArea.addEventListener('click', (e) => {
    const copyBtn = e.target.closest('[data-action="copy"]');
    if (!copyBtn) return;
    const content = copyBtn.closest('.message')?.querySelector('.msg-content');
    if (!content) return;
    const text = content.innerText;
    copyText(text).then((ok) => {
      copyBtn.textContent = ok ? '✓ Kopyalandı' : 'Kopyalanamadı';
      setTimeout(() => { copyBtn.textContent = 'Kopyala'; }, 1600);
    });
  });

  userInput.addEventListener('input', () => {
    userInput.style.height = 'auto';
    userInput.style.height = `${Math.min(userInput.scrollHeight, 120)}px`;
    const len = userInput.value.length;
    if (!wordCountEl) return;
    wordCountEl.textContent = `${len} / ${MAX_CHARS}`;
    wordCountEl.classList.toggle('show', len > 0);
    wordCountEl.classList.toggle('danger', len > MAX_CHARS * 0.9);
    wordCountEl.classList.toggle('warning', len > MAX_CHARS * 0.75 && len <= MAX_CHARS * 0.9);
    updateSendState();
  });

  userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (isStreaming) stopStream();
      else sendMessage();
    }
  });

  sendBtn.addEventListener('click', () => {
    if (isStreaming) stopStream();
    else sendMessage();
  });

  document.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      userInput.value = chip.getAttribute('data-text') || chip.textContent.trim();
      sendMessage();
    });
  });

  tefekkurBtn?.addEventListener('click', () => {
    tefekkurMode = !tefekkurMode;
    tefekkurBtn.classList.toggle('active', tefekkurMode);
    document.body.classList.toggle('tefekkur-mode', tefekkurMode);
    showToast(tefekkurMode ? 'Tefekkür modu açıldı' : 'Tefekkür modu kapandı');
  });

  const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
  fileInput?.addEventListener('change', async () => {
    const files = [...(fileInput.files || [])].slice(0, 4);
    if (!files.length || !imgPreviewContainer) return;
    attachedImages = [];
    imgPreviewContainer.innerHTML = '';
    imgPreviewContainer.style.display = 'flex';

    for (const file of files) {
      if (file.size > MAX_IMAGE_BYTES) {
        showToast('Görsel çok büyük (max 4MB)');
        continue;
      }
      const dataUrl = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      attachedImages.push({ mimeType: file.type, data: String(dataUrl).split(',')[1] });

      const item = document.createElement('div');
      item.className = 'img-preview-item';
      const imgEl = document.createElement('img');
      imgEl.src = dataUrl;
      imgEl.alt = '';
      const rm = document.createElement('button');
      rm.type = 'button';
      rm.className = 'img-preview-remove';
      rm.setAttribute('aria-label', 'Kaldır');
      rm.textContent = '×';
      item.append(imgEl, rm);
      rm.addEventListener('click', () => {
        item.remove();
        attachedImages = attachedImages.filter((x) => x.data !== String(dataUrl).split(',')[1]);
        if (!imgPreviewContainer.children.length) imgPreviewContainer.style.display = 'none';
      });
      imgPreviewContainer.appendChild(item);
    }
    fileInput.value = '';
    showToast('Görsel eklendi — metinle birlikte gönder');
  });

  createModalController(settingsModal);

  settingsToggle?.addEventListener('click', openSettings);
  saveSettingsBtn?.addEventListener('click', saveSettings);
  closeSettingsBtn?.addEventListener('click', closeSettings);
  settingsModal?.addEventListener('click', (e) => {
    if (e.target === settingsModal) closeSettings();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSettings();
  });

  apiKeyInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveSettings();
  });
  userNameInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveSettings();
  });

  clearBtn?.addEventListener('click', () => {
    if (isStreaming) return;
    chatWrapper?.querySelectorAll('.error-msg, .retry-btn').forEach((el) => el.remove());
    virtualList.clear();
    conversationHistory = [];
    offlineQueue = [];
    saveOfflineQueue([]);
    clearHistoryDB();
    welcomeScreen.style.display = '';
    welcomeScreen.style.opacity = '0';
    requestAnimationFrame(() => {
      welcomeScreen.style.transition = 'opacity 0.4s ease';
      welcomeScreen.style.opacity = '1';
      welcomeScreen.style.transform = 'scale(1)';
    });
    welcomeVisible = true;
    showToast('Sohbet silindi. Yeniden başlayalım');
    showBubble('Beklemedeyim...');
  });

  initViewport({ bottomSection, chatArea, userInput });

  window.addEventListener('online', () => {
    netBar?.classList.remove('offline');
    showToast('İnternet bağlantısı sağlandı.');
    processOfflineQueue();
  });
  window.addEventListener('offline', () => {
    netBar?.classList.add('offline');
    showToast('Bağlantı koptu, çevrimdışısın.');
  });

  function checkOnboarding() {
    if (localStorage.getItem('anadolu_onboarded_v3')) return;
    const overlay = document.createElement('div');
    overlay.className = 'onboarding-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Hoş geldin');
    const tooltip = document.createElement('div');
    tooltip.className = 'onboarding-tooltip';
    tooltip.innerHTML = `
      <strong>Hoş Geldin Yoldaşım!</strong><br>
      Sohbete başlamadan önce sağ üstteki çark ikonuna tıklayıp API anahtarını mühürle.
      <button type="button" class="onboarding-btn" id="onboardGotIt">Anladım</button>
    `;
    overlay.appendChild(tooltip);
    document.body.appendChild(overlay);
    settingsToggle?.classList.add('settings-highlight');
    requestAnimationFrame(() => overlay.classList.add('active'));
    overlay.querySelector('#onboardGotIt').addEventListener('click', () => {
      overlay.classList.remove('active');
      localStorage.setItem('anadolu_onboarded_v3', 'true');
      setTimeout(() => overlay.remove(), 400);
      openSettings();
    });
  }

  let swRegistration = null;

  initPwa({ banner: $('pwaBanner'), installBtn: $('pwaInstallBtn'), dismissBtn: $('pwaDismissBtn') });
  registerServiceWorker({
    onUpdateReady: (reg) => {
      swRegistration = reg;
      if (!updateBar) return;
      updateBar.hidden = false;
      updateBar.classList.add('show');
    },
  });

  updateReloadBtn?.addEventListener('click', () => {
    if (swRegistration) activateWaitingWorker(swRegistration);
    else window.location.reload();
  });
  updateDismissBtn?.addEventListener('click', () => {
    updateBar?.classList.remove('show');
    setTimeout(() => { if (updateBar) updateBar.hidden = true; }, 350);
  });

  if (!navigator.onLine) netBar?.classList.add('offline');

  loadSettings();
  updateSendState();
  generateDynamicChips('', '');
  showBubble('Beklemedeyim...');

  await initIndexedDB().catch((e) => console.warn(e));
  await restoreChatHistory();
  showOfflinePending();
  checkOnboarding();
}
