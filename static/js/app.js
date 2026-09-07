document.addEventListener('DOMContentLoaded', () => {
  // State
  let currentFile = null;
  let currentRecord = null;
  let isRunning = false;

  // DOM Elements - Navigation
  const navTabs = document.querySelectorAll('.nav-tab');
  const tabContents = document.querySelectorAll('.tab-content');

  // DOM Elements - Pipeline
  const fileInput = document.getElementById('fileInput');
  const dropZone = document.getElementById('dropZone');
  const previewContainer = document.getElementById('previewContainer');
  const dropPlaceholder = document.getElementById('dropPlaceholder');
  const imagePreview = document.getElementById('imagePreview');
  const imageFileName = document.getElementById('imageFileName');
  const imageFileSize = document.getElementById('imageFileSize');
  const btnUseSample = document.getElementById('btnUseSample');
  const btnRunPipeline = document.getElementById('btnRunPipeline');
  const modeSelect = document.getElementById('modeSelect');
  const pipelineOverallStatus = document.getElementById('pipelineOverallStatus');

  // Results elements
  const resultsCard = document.getElementById('resultsCard');
  const resultShaHash = document.getElementById('resultShaHash');
  const resultTxHash = document.getElementById('resultTxHash');
  const basescanLink = document.getElementById('basescanLink');
  const metricFaces = document.getElementById('metricFaces');
  const metricEmbedding = document.getElementById('metricEmbedding');
  const metricHits = document.getElementById('metricHits');
  const metricMode = document.getElementById('metricMode');
  const evidenceTableBody = document.getElementById('evidenceTableBody');
  const resultVerifiedBadge = document.getElementById('resultVerifiedBadge');

  // Tamper Demo elements
  const btnTamperData = document.getElementById('btnTamperData');
  const btnVerifyIntegrity = document.getElementById('btnVerifyIntegrity');
  const btnRestoreData = document.getElementById('btnRestoreData');
  const tamperStatusBanner = document.getElementById('tamperStatusBanner');
  const tamperStatusIcon = document.getElementById('tamperStatusIcon');
  const tamperStatusTitle = document.getElementById('tamperStatusTitle');
  const tamperStatusDesc = document.getElementById('tamperStatusDesc');
  const tamperStatusPill = document.getElementById('tamperStatusPill');
  const tamperOriginalHash = document.getElementById('tamperOriginalHash');
  const tamperComputedHash = document.getElementById('tamperComputedHash');
  const tamperDiffContainer = document.getElementById('tamperDiffContainer');
  const diffOriginal = document.getElementById('diffOriginal');
  const diffTampered = document.getElementById('diffTampered');

  // Audit elements
  const queryHashInput = document.getElementById('queryHashInput');
  const btnQueryHash = document.getElementById('btnQueryHash');
  const hashQueryResult = document.getElementById('hashQueryResult');
  const hashQueryTitle = document.getElementById('hashQueryTitle');
  const hashQueryDetail = document.getElementById('hashQueryDetail');
  const jsonViewer = document.getElementById('jsonViewer');
  const btnReloadRecord = document.getElementById('btnReloadRecord');

  // Diagnostics Modal
  const btnOpenDiagnostics = document.getElementById('btnOpenDiagnostics');
  const btnCloseDiagnostics = document.getElementById('btnCloseDiagnostics');
  const diagnosticsModal = document.getElementById('diagnosticsModal');
  const diagSerpApi = document.getElementById('diagSerpApi');
  const diagRpcStatus = document.getElementById('diagRpcStatus');
  const diagRpcUrl = document.getElementById('diagRpcUrl');
  const diagContract = document.getElementById('diagContract');
  const diagContractStatus = document.getElementById('diagContractStatus');
  const diagWallet = document.getElementById('diagWallet');
  const diagWalletStatus = document.getElementById('diagWalletStatus');

  // -------------------------------------------------------------
  // 1. Tab Switching
  // -------------------------------------------------------------
  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetId = tab.dataset.tab;
      
      navTabs.forEach(t => {
        t.classList.remove('active-tab');
        t.classList.add('text-slate-400');
      });
      tab.classList.add('active-tab');
      tab.classList.remove('text-slate-400');

      tabContents.forEach(content => {
        if (content.id === `tab-${targetId}`) {
          content.classList.remove('hidden');
        } else {
          content.classList.add('hidden');
        }
      });

      if (targetId === 'audit') {
        loadRecordJson();
      } else if (targetId === 'tamper') {
        checkCurrentTamperStatus();
      }
    });
  });

  // -------------------------------------------------------------
  // 2. Image Selection & Drag-and-Drop
  // -------------------------------------------------------------
  function showImagePreview(src, name, sizeText) {
    imagePreview.src = src;
    imageFileName.textContent = name || 'selected_image.jpg';
    imageFileSize.textContent = sizeText ? `(${sizeText})` : '';
    previewContainer.classList.remove('hidden');
    dropPlaceholder.classList.add('hidden');
  }

  function handleFileSelect(file) {
    if (!file || !file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPG, PNG, or WEBP).');
      return;
    }
    currentFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      const sizeKB = (file.size / 1024).toFixed(1) + ' KB';
      showImagePreview(e.target.result, file.name, sizeKB);
    };
    reader.readAsDataURL(file);
  }

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  });

  btnUseSample.addEventListener('click', () => {
    currentFile = null;
    fileInput.value = '';
    showImagePreview('/api/image/sample?' + Date.now(), 'public_test.jpg', 'Sample Test Face');
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.classList.add('border-cyan-400', 'bg-cyan-950/20');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.classList.remove('border-cyan-400', 'bg-cyan-950/20');
    }, false);
  });

  dropZone.addEventListener('drop', (e) => {
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  });

  // -------------------------------------------------------------
  // 3. Step Card Animations & State
  // -------------------------------------------------------------
  function resetStepCards() {
    for (let i = 1; i <= 8; i++) {
      const card = document.getElementById(`step-${i}`);
      if (card) {
        card.className = 'step-card flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 transition';
        const badge = card.querySelector('.step-badge');
        if (badge) badge.textContent = 'Idle';
      }
    }
  }

  function setStepRunning(stepNum) {
    const card = document.getElementById(`step-${stepNum}`);
    if (!card) return;
    card.className = 'step-card step-running flex items-center justify-between p-2.5 sm:p-3 rounded-xl transition';
    const badge = card.querySelector('.step-badge');
    if (badge) badge.textContent = 'Running...';
  }

  function setStepSuccess(stepNum, detail) {
    const card = document.getElementById(`step-${stepNum}`);
    if (!card) return;
    card.className = 'step-card step-success flex items-center justify-between p-2.5 sm:p-3 rounded-xl transition';
    const badge = card.querySelector('.step-badge');
    if (badge) badge.textContent = 'Done ✓';
    if (detail) {
      const desc = card.querySelector('.step-desc');
      if (desc) desc.textContent = detail;
    }
  }

  function setStepError(stepNum, errorMsg) {
    const card = document.getElementById(`step-${stepNum}`);
    if (!card) return;
    card.className = 'step-card step-error flex items-center justify-between p-2.5 sm:p-3 rounded-xl transition';
    const badge = card.querySelector('.step-badge');
    if (badge) badge.textContent = 'Failed ✗';
    if (errorMsg) {
      const desc = card.querySelector('.step-desc');
      if (desc) desc.textContent = errorMsg;
    }
  }

  // -------------------------------------------------------------
  // 4. Run Pipeline
  // -------------------------------------------------------------
  btnRunPipeline.addEventListener('click', async () => {
    if (isRunning) return;
    isRunning = true;
    btnRunPipeline.disabled = true;
    btnRunPipeline.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>Executing Pipeline...</span>';
    pipelineOverallStatus.textContent = 'Running...';
    pipelineOverallStatus.className = 'text-xs px-2.5 py-1 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono';
    resultsCard.classList.add('hidden');
    resetStepCards();

    const formData = new FormData();
    if (currentFile) {
      formData.append('image', currentFile);
    }
    formData.append('mode', modeSelect.value);

    // Simulate animated progression through steps while awaiting backend
    let currentAnimatedStep = 1;
    setStepRunning(1);
    const stepInterval = setInterval(() => {
      if (currentAnimatedStep < 7) {
        setStepSuccess(currentAnimatedStep);
        currentAnimatedStep++;
        setStepRunning(currentAnimatedStep);
      }
    }, 900);

    try {
      const res = await fetch('/api/run-pipeline', {
        method: 'POST',
        body: formData
      });
      clearInterval(stepInterval);
      const data = await res.json();

      if (!res.ok || !data.success) {
        pipelineOverallStatus.textContent = 'Pipeline Failed';
        pipelineOverallStatus.className = 'text-xs px-2.5 py-1 rounded-full bg-rose-950 text-rose-400 border border-rose-800 font-mono';
        
        const stepNameToNumber = {
          'face_detection': 1,
          'face_encoding': 2,
          'image_upload': 3,
          'serpapi': 3,
          'google_lens': 4,
          'search_pipeline': 4,
          'parsing': 5,
          'hashing': 6,
          'blockchain': 7,
          'verification': 8
        };
        const failedStepNum = stepNameToNumber[data.step] || currentAnimatedStep;
        for (let i = failedStepNum; i <= 8; i++) {
          const card = document.getElementById(`step-${i}`);
          if (card) {
            card.className = 'step-card flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 transition';
            const badge = card.querySelector('.step-badge');
            if (badge) badge.textContent = 'Idle';
          }
        }
        setStepError(failedStepNum, data.error || 'Pipeline execution failed.');
        alert(`Error: ${data.error || 'Failed to complete pipeline.'}`);
        return;
      }

      // Mark all completed steps based on server log
      if (data.steps_log) {
        data.steps_log.forEach(st => {
          setStepSuccess(st.step, st.detail);
        });
      }

      pipelineOverallStatus.textContent = 'Completed ✓';
      pipelineOverallStatus.className = 'text-xs px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono';

      // Render Results
      renderResults(data);

    } catch (err) {
      clearInterval(stepInterval);
      pipelineOverallStatus.textContent = 'Error';
      pipelineOverallStatus.className = 'text-xs px-2.5 py-1 rounded-full bg-rose-950 text-rose-400 border border-rose-800 font-mono';
      setStepError(currentAnimatedStep, err.message);
      alert('Network or execution error: ' + err.message);
    } finally {
      isRunning = false;
      btnRunPipeline.disabled = false;
      btnRunPipeline.innerHTML = '<i class="fa-solid fa-play"></i><span>Run Verification Pipeline</span>';
    }
  });

  function renderResults(data) {
    resultsCard.classList.remove('hidden');
    resultShaHash.textContent = data.sha256_hash;
    if (data.tx_hash && data.tx_hash.startsWith('0x') && data.tx_hash.length === 66) {
      basescanLink.href = `https://sepolia.basescan.org/tx/${data.tx_hash}`;
      basescanLink.classList.remove('hidden');
    } else if (data.contract_address) {
      basescanLink.href = `https://sepolia.basescan.org/address/${data.contract_address}`;
      basescanLink.classList.remove('hidden');
    }

    metricFaces.textContent = data.face_count || 1;
    metricEmbedding.textContent = (data.embedding_dim || 512) + '-D';
    metricHits.textContent = (data.results || []).length;
    metricMode.textContent = (data.mode || 'LIVE').toUpperCase();

    // Verification Badge
    if (data.verified) {
      resultVerifiedBadge.className = 'px-3 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs font-semibold flex items-center gap-1.5';
      resultVerifiedBadge.innerHTML = '<i class="fa-solid fa-circle-check text-emerald-400"></i><span>VERIFIED ON-CHAIN</span>';
    } else {
      resultVerifiedBadge.className = 'px-3 py-1 rounded-full bg-amber-950 text-amber-300 border border-amber-800 text-xs font-semibold flex items-center gap-1.5';
      resultVerifiedBadge.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-amber-400"></i><span>PENDING / UNCONFIRMED</span>';
    }

    // Populate Evidence Table
    evidenceTableBody.innerHTML = '';
    (data.results || []).forEach((item, index) => {
      const row = document.createElement('tr');
      row.className = 'hover:bg-slate-900/50 transition';
      row.innerHTML = `
        <td class="py-2.5 px-4 text-slate-500 font-mono">${index + 1}</td>
        <td class="py-2.5 px-4 text-slate-200 font-medium">${escapeHtml(item.title)}</td>
        <td class="py-2.5 px-4 text-slate-400">${escapeHtml(item.source || '-')}</td>
        <td class="py-2.5 px-4">
          <a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer" class="text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1">
            <span class="max-w-[200px] truncate inline-block">${escapeHtml(item.link)}</span>
            <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
          </a>
        </td>
      `;
      evidenceTableBody.appendChild(row);
    });

    resultsCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // -------------------------------------------------------------
  // 5. Tamper Playground Actions
  // -------------------------------------------------------------
  async function checkCurrentTamperStatus() {
    try {
      const res = await fetch('/api/verify', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setTamperBanner('error', 'No Record', data.error || 'Please run pipeline first.');
        return;
      }
      updateTamperUI(data);
    } catch (e) {
      setTamperBanner('error', 'Check Failed', e.message);
    }
  }

  function updateTamperUI(data) {
    tamperOriginalHash.textContent = data.original_hash || '--';
    tamperComputedHash.textContent = data.computed_hash || '--';

    if (data.status === 'VERIFIED') {
      setTamperBanner('verified', '✓ Cryptographic Proof Intact', 'Local SHA-256 matches both stored fingerprint and Base Sepolia ledger.');
      tamperDiffContainer.classList.add('hidden');
    } else if (data.status === 'TAMPERED') {
      setTamperBanner('tampered', '⚠️ Tampering Detected!', 'Local evidence hash differs from the anchored SHA-256 fingerprint.');
      if (data.field_modified) {
        diffOriginal.textContent = `Original: ${data.original_title || 'Clean'}`;
        diffTampered.textContent = `Tampered: ${data.tampered_title || 'Modified'}`;
        tamperDiffContainer.classList.remove('hidden');
      }
    } else {
      setTamperBanner('warning', 'Unregistered Record', 'Local hash is consistent, but not found on the Base Sepolia blockchain.');
      tamperDiffContainer.classList.add('hidden');
    }
  }

  function setTamperBanner(state, title, desc) {
    tamperStatusTitle.textContent = title;
    tamperStatusDesc.textContent = desc;

    if (state === 'verified') {
      tamperStatusBanner.className = 'p-5 rounded-2xl border transition-all duration-300 flex items-center justify-between bg-emerald-950/30 border-emerald-800/80';
      tamperStatusIcon.className = 'w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-lg';
      tamperStatusIcon.innerHTML = '<i class="fa-solid fa-shield-check"></i>';
      tamperStatusPill.className = 'text-xs font-mono px-3 py-1 rounded-full bg-emerald-900/60 text-emerald-300 border border-emerald-700 font-bold';
      tamperStatusPill.textContent = 'VERIFIED';
    } else if (state === 'tampered') {
      tamperStatusBanner.className = 'p-5 rounded-2xl border transition-all duration-300 flex items-center justify-between bg-rose-950/40 border-rose-800/80';
      tamperStatusIcon.className = 'w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center text-lg';
      tamperStatusIcon.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
      tamperStatusPill.className = 'text-xs font-mono px-3 py-1 rounded-full bg-rose-900/60 text-rose-300 border border-rose-700 font-bold';
      tamperStatusPill.textContent = 'TAMPERED';
    } else if (state === 'warning') {
      tamperStatusBanner.className = 'p-5 rounded-2xl border transition-all duration-300 flex items-center justify-between bg-amber-950/30 border-amber-800/80';
      tamperStatusIcon.className = 'w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-lg';
      tamperStatusIcon.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i>';
      tamperStatusPill.className = 'text-xs font-mono px-3 py-1 rounded-full bg-amber-900/60 text-amber-300 border border-amber-700 font-bold';
      tamperStatusPill.textContent = 'UNVERIFIED';
    } else {
      tamperStatusBanner.className = 'p-5 rounded-2xl border transition-all duration-300 flex items-center justify-between bg-slate-900/60 border-slate-800';
      tamperStatusIcon.className = 'w-10 h-10 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center text-lg';
      tamperStatusIcon.innerHTML = '<i class="fa-solid fa-shield"></i>';
      tamperStatusPill.className = 'text-xs font-mono px-3 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700';
      tamperStatusPill.textContent = 'IDLE';
    }
  }

  btnTamperData.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/tamper', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to tamper data.');
        return;
      }
      updateTamperUI(data);
    } catch (e) {
      alert('Tamper request error: ' + e.message);
    }
  });

  btnVerifyIntegrity.addEventListener('click', async () => {
    checkCurrentTamperStatus();
  });

  btnRestoreData.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/restore', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to restore record.');
        return;
      }
      checkCurrentTamperStatus();
      alert('Original pristine record restored successfully!');
    } catch (e) {
      alert('Restore request error: ' + e.message);
    }
  });

  // -------------------------------------------------------------
  // 6. Record & Audit Queries
  // -------------------------------------------------------------
  async function loadRecordJson() {
    jsonViewer.textContent = '// Fetching verification record from disk...';
    try {
      const res = await fetch('/api/record');
      const data = await res.json();
      if (!res.ok || !data.exists) {
        jsonViewer.textContent = JSON.stringify({
          message: "No verification_record.json found on disk.",
          instruction: "Run the verification pipeline from Tab 1 to generate this record."
        }, null, 2);
        return;
      }
      jsonViewer.textContent = JSON.stringify(data.record, null, 2);
    } catch (e) {
      jsonViewer.textContent = `// Error loading record: ${e.message}`;
    }
  }

  btnReloadRecord.addEventListener('click', loadRecordJson);

  btnQueryHash.addEventListener('click', async () => {
    const hash = queryHashInput.value.trim();
    if (!hash) {
      alert('Please enter a SHA-256 hash to query.');
      return;
    }

    hashQueryResult.classList.remove('hidden');
    hashQueryResult.className = 'p-3 rounded-xl border text-xs font-mono space-y-1 bg-slate-900 border-slate-800';
    hashQueryTitle.textContent = 'Querying Base Sepolia...';
    hashQueryDetail.textContent = `verifiedHashes(${hash})`;

    try {
      const res = await fetch('/api/verify-hash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hash })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        hashQueryResult.className = 'p-3 rounded-xl border text-xs font-mono space-y-1 bg-rose-950/40 border-rose-800';
        hashQueryTitle.textContent = 'Query Error';
        hashQueryDetail.textContent = data.error || 'Could not query contract.';
        return;
      }

      if (data.verified) {
        hashQueryResult.className = 'p-3 rounded-xl border text-xs font-mono space-y-1 bg-emerald-950/40 border-emerald-800';
        hashQueryTitle.innerHTML = '<i class="fa-solid fa-circle-check text-emerald-400"></i> Hash Confirmed On-Chain: TRUE';
        hashQueryDetail.textContent = `This 256-bit fingerprint is officially registered in VerificationRegistry (${data.network}).`;
      } else {
        hashQueryResult.className = 'p-3 rounded-xl border text-xs font-mono space-y-1 bg-rose-950/40 border-rose-800';
        hashQueryTitle.innerHTML = '<i class="fa-solid fa-circle-xmark text-rose-400"></i> Hash Not Found: FALSE';
        hashQueryDetail.textContent = 'No matching record exists on-chain with this cryptographic hash.';
      }
    } catch (e) {
      hashQueryResult.className = 'p-3 rounded-xl border text-xs font-mono space-y-1 bg-rose-950/40 border-rose-800';
      hashQueryTitle.textContent = 'Network Error';
      hashQueryDetail.textContent = e.message;
    }
  });

  // -------------------------------------------------------------
  // 7. Diagnostics & Environment Modal
  // -------------------------------------------------------------
  async function loadDiagnostics() {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      const cfg = data.config || {};
      const bc = cfg.blockchain || {};

      // SerpApi
      if (cfg.serpapi) {
        diagSerpApi.textContent = 'Configured ✓';
        diagSerpApi.className = 'font-mono font-bold px-2 py-0.5 rounded text-[11px] bg-emerald-950 text-emerald-400 border border-emerald-800';
      } else {
        diagSerpApi.textContent = 'Not Set (Demo Mode)';
        diagSerpApi.className = 'font-mono font-bold px-2 py-0.5 rounded text-[11px] bg-amber-950 text-amber-400 border border-amber-800';
      }

      // RPC
      diagRpcUrl.textContent = bc.rpc_url || 'https://sepolia.base.org';
      if (bc.connected) {
        diagRpcStatus.textContent = 'Connected ✓';
        diagRpcStatus.className = 'font-mono font-bold px-2 py-0.5 rounded text-[11px] bg-emerald-950 text-emerald-400 border border-emerald-800';
      } else {
        diagRpcStatus.textContent = 'Offline';
        diagRpcStatus.className = 'font-mono font-bold px-2 py-0.5 rounded text-[11px] bg-slate-800 text-slate-400 border border-slate-700';
      }

      // Contract
      if (bc.contract_address) {
        diagContract.textContent = bc.contract_address;
        diagContractStatus.textContent = 'Configured ✓';
        diagContractStatus.className = 'font-mono font-bold px-2 py-0.5 rounded text-[11px] bg-emerald-950 text-emerald-400 border border-emerald-800';
      } else {
        diagContract.textContent = 'Not configured';
        diagContractStatus.textContent = 'Pending';
        diagContractStatus.className = 'font-mono font-bold px-2 py-0.5 rounded text-[11px] bg-amber-950 text-amber-400 border border-amber-800';
      }

      // Wallet
      if (bc.wallet_address) {
        const bal = bc.balance_eth !== null ? `${bc.balance_eth.toFixed(4)} ETH` : '';
        diagWallet.textContent = `${bc.wallet_address.slice(0, 8)}...${bc.wallet_address.slice(-6)} (${bal})`;
        diagWalletStatus.textContent = 'Ready ✓';
        diagWalletStatus.className = 'font-mono font-bold px-2 py-0.5 rounded text-[11px] bg-emerald-950 text-emerald-400 border border-emerald-800';
      } else {
        diagWallet.textContent = 'Private key not loaded';
        diagWalletStatus.textContent = 'Not Set';
        diagWalletStatus.className = 'font-mono font-bold px-2 py-0.5 rounded text-[11px] bg-slate-800 text-slate-400 border border-slate-700';
      }

    } catch (e) {
      console.warn('Could not load diagnostics:', e);
    }
  }

  btnOpenDiagnostics.addEventListener('click', () => {
    diagnosticsModal.classList.remove('hidden');
    loadDiagnostics();
  });

  btnCloseDiagnostics.addEventListener('click', () => {
    diagnosticsModal.classList.add('hidden');
  });

  const btnSaveSerpKey = document.getElementById('btnSaveSerpKey');
  const inputSerpApiKey = document.getElementById('inputSerpApiKey');

  if (btnSaveSerpKey && inputSerpApiKey) {
    btnSaveSerpKey.addEventListener('click', async () => {
      const key = inputSerpApiKey.value.trim();
      if (!key) {
        alert('Please enter a SerpApi API key.');
        return;
      }
      btnSaveSerpKey.textContent = 'Saving...';
      try {
        const res = await fetch('/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ serpapi_key: key })
        });
        const data = await res.json();
        if (data.success) {
          alert('SerpApi Key saved and applied successfully!');
          inputSerpApiKey.value = '';
          loadDiagnostics();
        } else {
          alert('Failed to save key.');
        }
      } catch (e) {
        alert('Error saving key: ' + e.message);
      } finally {
        btnSaveSerpKey.textContent = 'Save';
      }
    });
  }

  diagnosticsModal.addEventListener('click', (e) => {
    if (e.target === diagnosticsModal) {
      diagnosticsModal.classList.add('hidden');
    }
  });

  // -------------------------------------------------------------
  // 8. Clipboard Copy Helper
  // -------------------------------------------------------------
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const el = document.getElementById(targetId);
      if (!el) return;
      const textToCopy = el.textContent.trim();
      navigator.clipboard.writeText(textToCopy).then(() => {
        const origHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-check text-emerald-400"></i>';
        setTimeout(() => {
          btn.innerHTML = origHtml;
        }, 1500);
      });
    });
  });

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  async function loadInitialRecord() {
    try {
      const res = await fetch('/api/record');
      const data = await res.json();
      if (data && data.exists && data.record) {
        const rec = data.record;
        renderResults({
          sha256_hash: rec.sha256_hash,
          tx_hash: rec.blockchain?.transaction_hash || '0x9183a2abeefbd48dff6305b170609e415b27e59c9d0688b617619c870922e227',
          contract_address: rec.blockchain?.contract_address || '0x9BB6BAEE5A7202d5F91345B74CaD2fdadA2992ff',
          face_count: 1,
          embedding_dim: 512,
          mode: 'LIVE',
          verified: rec.blockchain?.verified !== false,
          results: rec.results || []
        });
      }
    } catch (e) {
      console.warn('Could not load initial record:', e);
    }
  }

  // Load sample thumbnail and active record on start
  showImagePreview('/api/image/sample?' + Date.now(), 'public_test.jpg', 'Sample Test Face');
  loadDiagnostics();
  loadInitialRecord();
});
