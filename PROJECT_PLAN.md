# PROJECT_PLAN.md — AI-Powered Synthetic Data Generation Platform

**Platform Title**: DGen AI  
**Subtitle**: Privacy-Preserving, Statistically Accurate and Fraud-Aware Synthetic Banking Transaction Data Generator  
**Academic Program**: Final Year B.E. Computer Science & Design Major Project  

---

## 1. Executive Summary & Core USP
DGen AI is an enterprise-grade academic platform designed to address the scarcity of realistic, privacy-compliant banking datasets. The platform generates synthetic financial transaction records using state-of-the-art tabular generative AI architectures (CTGAN, PyTorch VAE, and Conditional Generators) and evaluates them across five core dimensions:
1. **Statistical Fidelity**: Real vs synthetic feature distributions, correlation heatmaps, KS statistics, and Wasserstein distances.
2. **Banking Logical Validity**: Custom rule validation for non-negative balances, valid ages, logically consistent account bounds, and audit reporting.
3. **Diversity Score**: Unique pattern coverage and duplicate detection.
4. **Privacy Risk Assessment**: Distance to Closest Record (DCR) and exact duplicate overlap detection.
5. **Downstream Fraud-Detection ML Utility**: Experimental benchmark comparing classifiers (Random Forest / XGBoost) trained on Real, Synthetic, and Combined data on an independent test set.

---

## 2. Environment & Technical Stack
- **Operating System**: Windows (PowerShell & CMD)
- **Frontend**: React 18+, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts, Plotly
- **Backend**: Python 3.14, FastAPI, Pydantic v2, Uvicorn
- **Data & ML Stack**: Pandas, NumPy, Scikit-learn, XGBoost, PyTorch, CTGAN, SDV, Copulas
- **Persistence**: MongoDB Storage Abstraction (with file-backed Mongo Mock fallback for local zero-config execution) + File Storage Service (`storage/`)
- **Authentication**: JWT with passlib/bcrypt password hashing
- **Testing**: Pytest, Vitest/React Testing Library, Browser Verification

---

## 3. Implementation Roadmap
- **Phase 0 — Project Analysis & Architecture Plan** *(Completed)*
- **Phase 1 — Foundation & Core Infrastructure Setup**
- **Phase 2 — Dataset Engine, Profiling & Preprocessing Pipeline**
- **Phase 3 — Generative AI Models Engine (CTGAN, VAE, Conditional)**
- **Phase 4 — Banking Rule & Logical Constraint Engine**
- **Phase 5 — Statistical, Diversity & Privacy Evaluation Engine**
- **Phase 6 — Downstream Fraud-Detection ML Utility Framework**
- **Phase 7 — Model Comparison Matrix & Experiment Store**
- **Phase 8 — Dataset & Comprehensive Evaluation Report Exporter**
- **Phase 9 — SaaS-Grade Frontend UI/UX Development**
- **Phase 10 — Security Hardening, Automated Testing & End-to-End Verification**
- **Phase 11 — Documentation & Viva Demo Kit**

---

## 4. Key Differentiators over Basic GAN Scripts
- **Fraud-Aware Synthetic Data Generation**: Custom target fraud ratio control.
- **Banking Constraint Audit**: Identifies and repairs logically impossible records (e.g. negative balance, impossible timestamps).
- **Academic Scorecard**: Mathematically rigorous weighted scorecard combining Fidelity (30%), Diversity (20%), Validity (20%), Privacy (10%), and ML Utility (20%).
- **Independent Test Set Integrity**: Prevents data leakage in downstream machine learning evaluation.
- **Full Platform Workflow**: Interactive SaaS UI for real-time profiling, training, evaluation, and report exports.
