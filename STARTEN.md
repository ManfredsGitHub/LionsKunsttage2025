# Projekt starten

## Einmalig auf einem neuen Rechner installieren

**1. Homebrew** (macOS-Paketmanager):
```
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

**2. Python 3.11+:**
```
brew install python@3.11
```

**3. Node.js:**
```
brew install node
```

---

## Projekt starten

**Terminal 1 — Backend:**
```bash
cd /Volumes/T7\ Safe/Claude\ Programme/Claude\ Lions\ Kunsttage\ 26/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

**Terminal 2 — Frontend:**
```bash
cd /Volumes/T7\ Safe/Claude\ Programme/Claude\ Lions\ Kunsttage\ 26/frontend
npm install
npm run dev
```

Dann im Browser: **http://localhost:3000**

---

> `npm install` und `pip install -r requirements.txt` nur beim **ersten Mal** auf einem neuen Rechner nötig.
> Danach reichen `uvicorn main:app --reload` und `npm run dev`.
