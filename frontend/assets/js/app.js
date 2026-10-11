(() => {
  const $ = (id) => document.getElementById(id);
  const STORAGE_KEY = "qrscoutSavedState";
  const DEFAULT_SYNC_URL = "https://qr-scout-online.onrender.com/api/sheets-sync";
  let config = null;
  let lastPayload = "";

  const sampleConfig = {
    title: "Millerbots Scouting",
    page_title: "Millerbots Scouting",
    teamNumber: 2549,
    delimiter: "\\t",
    sections: [
      {
        name: "Prematch",
        fields: [
          { title: "Scouter Initials", description: "Enter the initials of the scouter.", type: "text", required: true, code: "scouter", defaultValue: "" },
          { title: "Match Number", description: "Select the match number.", type: "number", required: true, code: "matchNumber", defaultValue: 1 },
          { title: "Robot number", description: "Enter the robot number you're scouting.", type: "text", required: true, code: "robot", defaultValue: "" },
          { title: "Starting Position", type: "select", required: true, code: "startPos", defaultValue: "", choices: { B1:"Blue 1", B2:"Blue 2", B3:"Blue 3", R1:"Red 1", R2:"Red 2", R3:"Red 3" } },
          { title: "No Show", type: "boolean", required: false, code: "noShow", defaultValue: false }
        ]
      },
      {
        name: "Autonomous",
        fields: [
          { title: "Had auto?", type: "boolean", code: "Auto", defaultValue: false },
          { title: "Fuel Scored in Auto?", type: "counter", code: "autoFuelScored", defaultValue: 0, min: 0, step: 3 },
          { title: "Fuel Missed in Auto?", type: "counter", code: "autoFuelMissed", defaultValue: 0, min: 0, step: 1 },
          { title: "Climbed in auto?", type: "boolean", code: "auClimb", defaultValue: false },
          { title: "Auto effectiveness", type: "range", code: "autoEff", defaultValue: 4, min: 1, max: 7, step: 1 }
        ]
      },
      {
        name: "Teleop",
        fields: [
          { title: "Alliance won auto?", type: "boolean", code: "allianceWonAuto", defaultValue: false },
          { title: "Fuel Scored in Teleop?", type: "counter", code: "telFuelScored", defaultValue: 0, min: 0, step: 3 },
          { title: "Fuel Missed in Teleop?", type: "counter", code: "telFuelMissed", defaultValue: 0, min: 0, step: 1 },
          { title: "Defended during match?", type: "boolean", code: "robotDefended", defaultValue: false },
          { title: "Passed during match?", type: "boolean", code: "pass", defaultValue: false },
          { title: "Bump?", type: "boolean", code: "bump", defaultValue: false },
          { title: "Trench?", type: "boolean", code: "trench", defaultValue: false },
          { title: "Stuck on fuel during match?", type: "boolean", code: "fuelStuck", defaultValue: false },
          { title: "Issues", type: "select", required: true, code: "Failures", defaultValue: "No", choices: { No:"Zero issues", Mech:"Mechanical issue", Die:"Died/disconnected", Tip:"Tipped/fell over", Stu:"Stuck for >5-10 seconds", F:"Multiple issues (elaborate in comments)" } }
        ]
      },
      {
        name: "Endgame/Postmatch",
        fields: [
          { title: "Climbed", type: "select", required: true, code: "climbedTel", defaultValue: "No", choices: { No:"No Climb", L1:"Level 1", L2:"Level 2", L3:"Level 3", F:"Failed Climb" } },
          { title: "Scored How?", type: "select", required: true, code: "scoredHow", defaultValue: "blank", choices: { blank:"(blank)", driving:"While driving", stationary:"While stationary", both:"Both", none:"No scoring" } },
          { title: "Scoring Accuracy", type: "range", code: "scoringEff", defaultValue: 4, min: 1, max: 7, step: 1 },
          { title: "Scoring Speed", type: "range", code: "scoringSped", defaultValue: 4, min: 1, max: 7, step: 1 },
          { title: "Intake Effectiveness", type: "range", code: "intakeEff", defaultValue: 4, min: 1, max: 7, step: 1 },
          { title: "Driving skill", type: "range", code: "drivSkill", defaultValue: 4, min: 1, max: 7, step: 1 },
          { title: "Passing Skill", type: "range", code: "passSkill", defaultValue: 1, min: 1, max: 7, step: 1 },
          { title: "Defense Skill", type: "range", code: "defSkill", defaultValue: 1, min: 1, max: 7, step: 1 },
          { title: "Yellow/Red Card", type: "select", required: true, code: "yc", defaultValue: "No Card", choices: { "No Card":"No Card", Yellow:"Yellow Card", Red:"Red Card" } },
          { title: "Comments", type: "text", code: "co", defaultValue: "" }
        ]
      }
    ]
  };

  function safeId(value) {
    return "field_" + String(value || "unknown").replace(/[^a-zA-Z0-9_-]/g, "_");
  }

  function getSavedState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  function clearSavedState() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function saveCurrentState() {
    if (!config || !$("formArea")) return;
    const formState = {};
    $("formArea").querySelectorAll("[data-field-code]").forEach((control) => {
      const code = control.dataset.fieldCode;
      const type = control.dataset.fieldType;
      let value;
      if (type === "boolean") value = control.checked;
      else if (type === "number" || type === "counter" || type === "range") value = control.value === "" ? "" : Number(control.value);
      else value = control.value;
      formState[code] = value;
    });

    const currentSyncUrl = $("googleFormUrl") ? ($("googleFormUrl").value.trim() || DEFAULT_SYNC_URL) : (config.googleFormUrl || DEFAULT_SYNC_URL);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ config, form: formState, syncUrl: currentSyncUrl }));
  }

  function applySavedValues() {
    const saved = getSavedState();
    if (!saved || !saved.form) return;
    $("formArea").querySelectorAll("[data-field-code]").forEach((control) => {
      const code = control.dataset.fieldCode;
      const value = saved.form[code];
      if (value === undefined) return;
      const type = control.dataset.fieldType;
      if (type === "boolean") control.checked = Boolean(value);
      else if (type === "range" || type === "counter" || type === "number") control.value = value ?? "";
      else if (type === "select") control.value = value ?? "";
      else control.value = value ?? "";
    });
  }

  function makeField(field) {
    const wrapper = document.createElement("div");
    wrapper.className = "field";
    const id = safeId(field.code);
    const label = document.createElement("label");
    label.htmlFor = id;
    label.textContent = field.title || field.code || "Field";
    if (field.required) label.textContent += " *";
    wrapper.appendChild(label);

    let input;
    if (field.type === "boolean") {
      const line = document.createElement("div");
      line.className = "checkline";
      input = document.createElement("input");
      input.type = "checkbox";
      input.checked = Boolean(field.defaultValue);
      input.id = id;
      const yes = document.createElement("label");
      yes.htmlFor = id;
      yes.textContent = "Yes";
      line.append(input, yes);
      wrapper.appendChild(line);
    } else if (field.type === "select") {
      input = document.createElement("select");
      input.id = id;
      const blank = document.createElement("option");
      blank.value = "";
      blank.textContent = "Choose an option…";
      input.appendChild(blank);
      Object.entries(field.choices || {}).forEach(([value, text]) => {
        const opt = document.createElement("option");
        opt.value = value;
        opt.textContent = text;
        input.appendChild(opt);
      });
      input.value = field.defaultValue ?? "";
      wrapper.appendChild(input);
    } else if (field.type === "range") {
      input = document.createElement("input");
      input.type = "range";
      input.id = id;
      input.min = field.min ?? 0;
      input.max = field.max ?? 10;
      input.step = field.step ?? 1;
      input.value = field.defaultValue ?? input.min;
      const val = document.createElement("div");
      val.className = "hint";
      const update = () => { val.textContent = "Value: " + input.value; };
      input.addEventListener("input", update);
      update();
      wrapper.append(input, val);
    } else if (field.type === "counter") {
      const counter = document.createElement("div");
      counter.className = "counter-control";
      const minus = document.createElement("button");
      minus.type = "button";
      minus.className = "counter-btn minus";
      minus.textContent = "−";
      input = document.createElement("input");
      input.id = id;
      input.type = "number";
      input.min = field.min ?? 0;
      input.step = field.step ?? 1;
      if (field.max !== undefined) input.max = field.max;
      input.value = field.defaultValue ?? 0;
      const plus = document.createElement("button");
      plus.type = "button";
      plus.className = "counter-btn plus";
      plus.textContent = "+";
      const changeByStep = (direction) => {
        const step = Number(input.step) || 1;
        const current = input.value === "" ? Number(input.min || 0) : Number(input.value);
        let next = current + direction * step;
        if (input.min !== "") next = Math.max(Number(input.min), next);
        if (input.max !== "") next = Math.min(Number(input.max), next);
        input.value = String(next);
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      };
      minus.addEventListener("click", () => changeByStep(-1));
      plus.addEventListener("click", () => changeByStep(1));
      counter.append(minus, input, plus);
      wrapper.appendChild(counter);
    } else {
      input = document.createElement("input");
      input.id = id;
      input.type = field.type === "number" ? "number" : "text";
      if (field.type === "number") input.step = field.step ?? 1;
      if (field.max !== undefined && input.type === "text") input.maxLength = Number(field.max);
      input.value = field.defaultValue ?? "";
      wrapper.appendChild(input);
    }

    input.dataset.fieldCode = field.code;
    input.dataset.fieldType = field.type;
    input.dataset.required = field.required ? "true" : "false";
    if (field.description) {
      const hint = document.createElement("div");
      hint.className = "hint";
      hint.textContent = field.description;
      wrapper.appendChild(hint);
    }
    return wrapper;
  }

  function renderForm() {
    const area = $("formArea");
    area.innerHTML = "";
    if (!config || !Array.isArray(config.sections)) return;
    config.sections.forEach((section) => {
      const sectionEl = document.createElement("div");
      sectionEl.className = "section";
      const title = document.createElement("div");
      title.className = "section-title";
      title.textContent = section.name || "Fields";
      sectionEl.appendChild(title);
      (section.fields || []).forEach((field) => sectionEl.appendChild(makeField(field)));
      area.appendChild(sectionEl);
    });
    applySavedValues();
    $("configStatus").textContent = `${config.title || "Configuration"} loaded`;
  }

  function collectData() {
    const data = {};
    const controls = $("formArea").querySelectorAll("[data-field-code]");
    for (const control of controls) {
      const code = control.dataset.fieldCode;
      const type = control.dataset.fieldType;
      const required = control.dataset.required === "true";
      let value;
      if (type === "boolean") value = control.checked;
      else if (type === "number" || type === "counter" || type === "range") {
        value = control.value === "" ? "" : Number(control.value);
      } else {
        value = control.value.trim();
      }
      if (required && (value === "" || value === null || value === undefined)) {
        control.focus();
        throw new Error(`Please complete the required field: ${code}`);
      }
      data[code] = value;
    }
    return {
      title: config.title || "QR Scout",
      teamNumber: config.teamNumber ?? null,
      createdAt: new Date().toISOString(),
      data
    };
  }

  function setStatus(message, isError = false) {
    const el = $("configStatus");
    if (!el) return;
    el.textContent = message;
    el.classList.toggle("error", isError);
    el.classList.toggle("ok", !isError && /loaded|ready|generated/i.test(message));
  }

  function setGoogleFormStatus(message, isError = false) {
    const el = $("googleFormStatus");
    if (!el) return;
    el.textContent = message;
    el.className = "status" + (isError ? " error" : " ok");
  }

  function showModal() {
    $("commitModal").classList.remove("hidden");
    $("modalStatus").classList.add("hidden");
    $("modalQrBox").classList.add("hidden");
    $("modalQrBox").innerHTML = "";
    $("modalDownloadBtn").classList.add("hidden");
  }

  function hideModal() {
    $("commitModal").classList.add("hidden");
  }

  function setModalStatus(message, error = false, ok = false) {
    const el = $("modalStatus");
    el.textContent = message;
    el.className = "status" + (error ? " error" : ok ? " ok" : "");
  }

  function isFileProtocol() {
    return window.location.protocol === "file:";
  }

  function getSyncFailureDetails(scriptUrl, reasonText) {
    const hints = [];
    if (isFileProtocol()) {
      hints.push("Open the site over localhost or GitHub Pages instead of a file path.");
    }
    if (!scriptUrl) {
      hints.push("Paste the running backend API URL.");
    } else {
      try {
        const parsed = new URL(scriptUrl);
        if (!/^(https?|http):/.test(parsed.href)) {
          hints.push("Use a real HTTP or HTTPS backend URL.");
        }
      } catch (err) {
        hints.push("The backend URL is not valid. Copy the full API URL.");
      }
    }
    if (location.protocol === "https:" && /github\.io/i.test(location.hostname)) {
      hints.push("GitHub Pages is allowed, but the backend must be reachable over HTTP or HTTPS.");
    }
    if (String(reasonText).toLowerCase().includes("do get") || String(reasonText).toLowerCase().includes("script function not found")) {
      hints.push("This is a backend endpoint issue. Confirm the API is running and the URL is correct.");
    }
    if (!hints.length) {
      hints.push("Check that the backend is running and serving the API endpoint over HTTP.");
    }
    return `${reasonText} ${hints.join(" ")}`;
  }

  function downloadCsvFallback(payload) {
    const rows = [];
    const keys = Object.keys(payload.data || {});
    rows.push(["field", "value"].join(","));
    keys.forEach((key) => {
      const value = payload.data[key];
      const safeValue = String(value ?? "").replace(/"/g, '""');
      rows.push([`"${key}"`, `"${safeValue}"`].join(","));
    });
    const csv = rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-scout-fallback-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return csv;
  }

  function saveGoogleFormSync() {
    if (!config) {
      setGoogleFormStatus("Load a scouting configuration before saving a sync endpoint.", true);
      return;
    }

    const formUrl = $("googleFormUrl").value.trim();
    const sheetTabName = $("sheetTabName").value.trim() || "Sheet1";
    const finalUrl = formUrl || DEFAULT_SYNC_URL;

    try {
      new URL(finalUrl);
    } catch (err) {
      setGoogleFormStatus("The script URL is not valid.", true);
      return;
    }

    config.googleFormUrl = finalUrl;
    config.googleSheetTab = sheetTabName;
    $("googleFormUrl").value = finalUrl;
    $("sheetTabName").value = sheetTabName;
    setGoogleFormStatus("Script sync saved.", false);
    saveCurrentState();
  }

  function clearGoogleFormSync() {
    $("googleFormUrl").value = DEFAULT_SYNC_URL;
    $("sheetTabName").value = $("sheetTabName").value.trim() || "Sheet1";
    if (config) {
      config.googleFormUrl = DEFAULT_SYNC_URL;
      config.googleSheetTab = $("sheetTabName").value.trim() || "Sheet1";
    }
    setGoogleFormStatus("Default sync URL restored.", false);
    saveCurrentState();
  }

  function syncToGoogleForm() {
    if (!config || !config.googleFormUrl) {
      setModalStatus("Add the script URL in the sync panel first.", true);
      return;
    }

    if (isFileProtocol()) {
      setModalStatus("Open the site through GitHub Pages or localhost first, not file://. Example: http://localhost:8000", true);
      return;
    }

    try {
      const payload = collectData();
      const scriptUrl = (config.googleFormUrl || "").trim();
      const sheetTabName = (config.googleSheetTab || $("sheetTabName").value || "Sheet1").trim();

      if (!scriptUrl) {
        setModalStatus("Add the backend API URL before syncing.", true);
        return;
      }

      const body = JSON.stringify({
        title: payload.title,
        teamNumber: payload.teamNumber,
        createdAt: payload.createdAt,
        data: payload.data,
        row: Object.values(payload.data),
        sheetTab: sheetTabName
      });

      setModalStatus("Sending scouting data to the script...", false, true);

      fetch(scriptUrl, {
        method: "POST",
        mode: "cors",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json"
        },
        body
      }).then(async (res) => {
        const responseText = await res.text();
        let parsed = null;
        try {
          parsed = responseText ? JSON.parse(responseText) : null;
        } catch (err) {
          parsed = null;
        }

        if (!res.ok) {
          throw new Error(responseText || "Script request failed.");
        }

        if (parsed && parsed.ok === false) {
          throw new Error(parsed.error || "Script request rejected by the backend.");
        }

        setModalStatus("Scouting data sent successfully.", false, true);
      }).catch((err) => {
        const raw = err && err.message ? err.message : "Could not sync to the script.";
        const fallbackCsv = downloadCsvFallback(payload);
        const detailed = getSyncFailureDetails(scriptUrl, raw);
        setModalStatus(`${detailed} Manual backup downloaded as CSV so you can import it into Google Sheets.`, true);
        console.warn("Script sync failed. CSV fallback created.", { raw, fallbackCsv, scriptUrl, sheetTabName });
      });
    } catch (err) {
      const raw = err && err.message ? err.message : "Could not sync to the script.";
      const payload = collectData();
      const fallbackCsv = downloadCsvFallback(payload);
      const detailed = getSyncFailureDetails((config && config.googleFormUrl) || "", raw);
      setModalStatus(`${detailed} Manual backup downloaded as CSV so you can import it into Google Sheets.`, true);
      console.warn("Script sync exception. CSV fallback created.", { raw, fallbackCsv, config });
    }
  }

  function generateQrChoice() {
    if (!config) {
      setModalStatus("Please load a JSON configuration first.", true);
      return;
    }
    if (typeof QRCode === "undefined") {
      setModalStatus("QR library did not load. Check your internet connection and refresh.", true);
      return;
    }
    try {
      const payload = collectData();
      lastPayload = JSON.stringify(payload);
      $("modalQrBox").innerHTML = "";
      $("modalQrBox").classList.remove("hidden");
      new QRCode($("modalQrBox"), {
        text: lastPayload,
        width: 256,
        height: 256,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.L
      });
      $("modalDownloadBtn").classList.remove("hidden");
      setModalStatus("QR code generated. Scan it to retrieve the scouting data.", false, true);
    } catch (err) {
      setModalStatus(err.message || "Could not generate QR code.", true);
    }
  }

  function downloadQr() {
    const canvas = $("modalQrBox").querySelector("canvas");
    const img = $("modalQrBox").querySelector("img");
    const url = canvas ? canvas.toDataURL("image/png") : img ? img.src : "";
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-scout-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function resetFields() {
    if (!config) return;
    clearSavedState();
    renderForm();
    lastPayload = "";
    hideModal();
  }

  function applyConfig(obj) {
    if (!obj || !Array.isArray(obj.sections)) throw new Error("This JSON does not contain a sections array.");
    config = obj;
    config.googleFormUrl = config.googleFormUrl || DEFAULT_SYNC_URL;
    $("welcomeSection").classList.add("hidden");
    $("scoutingPage").classList.remove("hidden");
    renderForm();
    $("jsonEditor").value = JSON.stringify(config, null, 2);
    $("managerStatus").textContent = "Configuration loaded. You can edit, replace, or download this JSON.";
    $("managerStatus").className = "status ok";
    setStatus("Configuration loaded. Fill in the fields, then generate a QR code.");
    $("sheetTabName").value = config.googleSheetTab || "Sheet1";
    $("googleFormUrl").value = config.googleFormUrl || DEFAULT_SYNC_URL;
    setGoogleFormStatus("Script sync loaded.", false);
    saveCurrentState();
  }

  function restoreSavedConfiguration() {
    const saved = getSavedState();
    if (!saved || !saved.config || !Array.isArray(saved.config.sections)) return;
    config = saved.config;
    config.googleFormUrl = config.googleFormUrl || saved.syncUrl || DEFAULT_SYNC_URL;
    $("welcomeSection").classList.add("hidden");
    $("scoutingPage").classList.remove("hidden");
    renderForm();
    $("jsonEditor").value = JSON.stringify(config, null, 2);
    $("managerStatus").textContent = "Saved scouting data restored.";
    $("managerStatus").className = "status ok";
    $("sheetTabName").value = config.googleSheetTab || "Sheet1";
    $("googleFormUrl").value = config.googleFormUrl || DEFAULT_SYNC_URL;
    setStatus("Saved progress restored.");
  }

  $("configFile").addEventListener("change", async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      applyConfig(JSON.parse(await file.text()));
    } catch (err) {
      $("configStatus").textContent = "Could not load JSON.";
      setStatus(err.message || "Invalid JSON.", true);
    }
  });

  $("loadExample").addEventListener("click", () => {
    try {
      applyConfig(sampleConfig);
    } catch (err) {
      setStatus(err.message, true);
    }
  });

  $("commitBtn").addEventListener("click", showModal);
  $("resetBtn").addEventListener("click", resetFields);
  $("toggleConfigManagerBtn").addEventListener("click", () => {
    const manager = $("configManager");
    const isHidden = manager.classList.toggle("collapsed");
    $("toggleConfigManagerBtn").textContent = isHidden ? "Edit JSON" : "Hide JSON";
    if (!isHidden) manager.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  $("closeModalBtn").addEventListener("click", hideModal);
  $("commitModal").addEventListener("click", (e) => {
    if (e.target === $("commitModal")) hideModal();
  });
  $("qrChoiceBtn").addEventListener("click", generateQrChoice);
  $("syncChoiceBtn").addEventListener("click", syncToGoogleForm);
  $("applyGoogleFormBtn").addEventListener("click", saveGoogleFormSync);
  $("clearGoogleFormBtn").addEventListener("click", clearGoogleFormSync);
  $("toggleGoogleFormBtn").addEventListener("click", () => {
    const panel = $("googleFormSyncPanel");
    const collapsed = panel.classList.toggle("collapsed");
    $("toggleGoogleFormBtn").textContent = collapsed ? "Show sync" : "Hide sync";
    if (!collapsed) panel.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  $("modalDownloadBtn").addEventListener("click", downloadQr);

  $("formArea").addEventListener("input", saveCurrentState);
  $("formArea").addEventListener("change", saveCurrentState);

  $("applyJsonBtn").addEventListener("click", () => {
    try {
      const parsed = JSON.parse($("jsonEditor").value);
      applyConfig(parsed);
    } catch (err) {
      $("managerStatus").textContent = "Invalid JSON. Fix the syntax and try again.";
      $("managerStatus").className = "status error";
    }
  });

  $("uploadNewJsonBtn").addEventListener("click", () => {
    $("managerJsonFile").click();
  });

  $("managerJsonFile").addEventListener("change", async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      applyConfig(parsed);
    } catch (err) {
      $("managerStatus").textContent = "Could not load the JSON file.";
      $("managerStatus").className = "status error";
    }
  });

  $("downloadJsonBtn").addEventListener("click", () => {
    if (!config) return;
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "scouting-config.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  const syncInput = $("googleFormUrl");
  if (syncInput && !syncInput.value) {
    syncInput.value = DEFAULT_SYNC_URL;
  }

  const saved = getSavedState();
  if (saved && saved.config && Array.isArray(saved.config.sections)) {
    restoreSavedConfiguration();
  }
})();
