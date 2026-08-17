# DGen AI — AI-Powered Synthetic Data Generation Platform

**Subtitle:** Privacy-Preserving, Statistically Accurate and Fraud-Aware Synthetic Banking Transaction Data Generator  
**Degree:** Bachelor of Engineering (B.E.) — Computer Science & Design  
**Project Category:** Final Year Major Project  

---

## 📌 1. Project Abstract & Context
The acquisition of high-quality financial transaction datasets for machine learning research, fraud detection system benchmarking, and software testing is hindered by strict privacy regulations (e.g., GDPR, CCPA, PCI-DSS) and commercial confidentiality restrictions. 

**DGen AI** solves this problem by providing an end-to-end, enterprise-grade synthetic data generation and multi-dimensional evaluation platform specifically tailored for tabular banking transaction data. By leveraging state-of-the-art Generative AI architectures (**CTGAN Synthesizer**, custom **PyTorch Variational Autoencoder**, and **Conditional Class Target Ratio Sampling**), DGen AI generates privacy-preserving synthetic transactions while maintaining statistical correlation structures, enforcing domain-specific banking business logic constraints, and enhancing downstream fraud detection performance.

---

## 🏗️ 2. System Architecture & Data Pipeline

```
+-----------------------------------------------------------------------------------+
|                                 DGen AI Platform                              |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  [ Real Banking Dataset ]                                                         |
|           |                                                                       |
|           v                                                                       |
|  [ Data Preprocessing & Profiling Engine ]                                         |
|    - Pearson Correlation Matrix, Imputation, MinMax/Standard Scaling, Categorical Encoders
|           |                                                                       |
|           +-----------------------+-----------------------+                       |
|           |                       |                       |                       |
|           v                       v                       v                       |
|  [ CTGAN Synthesizer ]   [ PyTorch Tabular VAE ] [ Conditional Target Ratio Gen ] |
|  (SDV Continuous/Discrete) (Encoder/Latent N(0,I))  (Target Fraud Ratio Control)  |
|           |                       |                       |                       |
|           +-----------------------+-----------------------+                       |
|                                   |                                               |
|                                   v                                               |
|                  [ Synthetic Transaction Generator ]                              |
|                                   |                                               |
|           +-----------------------+-----------------------+                       |
|           |                       |                       |                       |
|           v                       v                       v                       |
| [ Banking Rule Constraint Engine ] [ Statistical Fidelity Engine ] [ Privacy Risk Assessment ] |
|  - Amount >= 0                    - KS-Test (D-stat, p-val) - Distance to Closest Record (DCR)
|  - Age 18-100                     - Wasserstein Distance ($W_1$) - Exact Overlap Matching %
|  - Balance Math Consistency       - Pearson Corr Delta    - Memorization Risk Flag
|  - Hour 0-23                      - Overall Fidelity Score - Academic Risk Rating
|           |                       |                       |                       |
|           +-----------------------+-----------------------+                       |
|                                   |                                               |
|                                   v                                               |
|               [ Downstream Fraud ML Utility Benchmark ]                           |
|  - Independent Real Test Set Reservation (25%)                                    |
|  - Model A (Real Only) vs Model B (Synthetic Only) vs Model C (Real + Synthetic)  |
|  - Accuracy, Precision, Recall, F1 Score, ROC-AUC, 2x2 Confusion Matrix           |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

---

## 🚀 3. Key Scientific Innovations & Features

### 1. Multi-Architecture Generative AI Suite
- **CTGAN Synthesizer**: Uses Conditional Generative Adversarial Networks with Mode-Specific Normalization for handling continuous numerical skewness and discrete categorical distributions.
- **PyTorch Tabular VAE**: A custom Variational Autoencoder mapping input feature matrices into Gaussian latent space $\mathcal{N}(\boldsymbol{\mu}, \mathbf{I})$ with continuous reconstruction loss ($\text{MSE}$) and KL Divergence regularization.
- **User-Controlled Conditional Generator**: Allows security researchers to specify explicit target fraud ratios (e.g., boosting minority fraud class `is_fraud = 1` from 2% up to 25%) while maintaining conditional feature dependencies.

### 2. Banking Business Rule & Logical Constraint Validation Engine
Evaluates generated synthetic records against 6 strict domain business logic rules:
1. **Amount Non-Negativity**: $\text{amount} \ge 0$.
2. **Age Bounds**: $18 \le \text{age} \le 100$.
3. **Balance Non-Negativity**: $\text{balance\_before} \ge 0$ and $\text{balance\_after} \ge 0$.
4. **Balance Math Consistency**: $|\text{balance\_after} - \max(0, \text{balance\_before} - \text{amount})| \le 100$.
5. **Timestamp Hour Validity**: $0 \le \text{transaction\_hour} \le 23$.
6. **Binary Fraud Integrity**: $\text{is\_fraud} \in \{0, 1\}$.

### 3. Rigorous Statistical & Academic Privacy Assessment
- **Statistical Fidelity Score ($0-100$)**: Computed via Kolmogorov-Smirnov test ($D$-statistic and $p$-value), Wasserstein distance ($W_1$), Mean/Std/Median deltas, and Pearson Correlation Heatmap Frobenius norm delta.
- **Academic Privacy Risk Assessment**: Evaluates Distance to Closest Record (DCR $\mu, \text{median}, p_{5}$), exact duplicate overlap with real training data, and assigns risk levels (`LOW_RISK`, `MEDIUM_RISK`, `HIGH_RISK`).

### 4. Downstream Fraud Detection ML Utility Benchmark
- Evaluates classifier performance (Random Forest) on an independent Real test set reserved prior to training.
- Benchmarks **Model A (Real Only)** vs **Model B (Synthetic Only)** vs **Model C (Real + Synthetic)** with F1 gain/loss metrics and $2 \times 2$ Confusion Matrices.

---

## 🛠️ 4. Tech Stack

| Layer | Technology / Library |
|---|---|
| **Backend Framework** | Python 3.14.4, FastAPI, Uvicorn, Pydantic v2 |
| **Generative ML Engines** | PyTorch 2.6+, SDV (Synthetic Data Vault), CTGAN, Scikit-Learn, SciPy |
| **Database & Storage** | MongoDB (with Local File JSON Mock Store fallback) |
| **Frontend UI** | React 18, TypeScript, Vite 5, Tailwind CSS, Lucide Icons, Recharts |
| **Testing Suite** | Pytest 9.1, AnyIO, Starlette TestClient |

---

## 💻 5. Installation & Setup Guide

### Prerequisites
- Python 3.10+ (Tested on Python 3.14.4)
- Node.js v18+ (Tested on Node v23.11.0) and npm

### 1. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows (or source venv/bin/activate on Linux/Mac)

# Install dependencies
pip install -r requirements.txt

# Run FastAPI Development Server
python -m uvicorn app.main:app --reload --port 8000
```
- API Documentation (Swagger UI): `http://localhost:8000/docs`
- ReDoc API Manual: `http://localhost:8000/redoc`

### 2. Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite Development Server
npm run dev
```
- Web Application UI: `http://localhost:5173`

---

## 🧪 6. Automated Testing Suite

DGen AI includes an automated Pytest unit and integration test suite with **18 passing test cases**:

```bash
# Run backend test suite
cd backend
python -m pytest
```

### Test Suite Execution Summary
- `tests/test_auth.py`: User registration, password hashing, JWT login, token verification (**PASSED**)
- `tests/test_datasets.py`: CSV upload, schema inference, profiling engine, median/mean scaling (**PASSED**)
- `tests/test_generation.py`: CTGAN model fitting, PyTorch VAE sampling, conditional class ratio targeting, async generation API pipeline (**8/8 PASSED**)
- `tests/test_constraints.py`: Banking constraint rule enforcement, invalid record detection, rule failure audit breakdown (**11/11 PASSED**)
- `tests/test_evaluation.py`: KS-tests, Wasserstein distance, privacy DCR metrics, full scorecard API (**15/15 PASSED**)
- `tests/test_fraud_ml.py`: Downstream fraud ML utility evaluation, model benchmarks, experiment store (**18/18 PASSED**)

---

## 📡 7. API Reference Summary

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/auth/register` | `POST` | User registration |
| `/api/v1/auth/login` | `POST` | JWT authentication login |
| `/api/v1/datasets/upload` | `POST` | Upload banking dataset CSV |
| `/api/v1/datasets/{id}/profile` | `POST` | Generate dynamic numerical & correlation profile |
| `/api/v1/generation` | `POST` | Submit background synthetic generation job |
| `/api/v1/generation/{job_id}` | `GET` | Poll background generation job status |
| `/api/v1/generation/{job_id}/download` | `GET` | Download generated synthetic CSV dataset |
| `/api/v1/evaluation/constraints` | `POST` | Audit 6 banking business logic rules |
| `/api/v1/evaluation/statistical` | `POST` | Compute KS-tests & correlation deltas |
| `/api/v1/evaluation/privacy` | `POST` | Evaluate DCR privacy distance & exact match overlap |
| `/api/v1/evaluation/full` | `POST` | Aggregate multi-dimensional quality scorecard |
| `/api/v1/evaluation/fraud` | `POST` | Benchmark downstream fraud ML classifier utility |
| `/api/v1/experiments/benchmark` | `GET` | Compare CTGAN vs VAE vs Conditional models side-by-side |

---

## 🎓 8. Academic Evaluation & Viva Defense Q&A

### Q1: How does CTGAN handle multimodal numerical distributions?
**Answer:** CTGAN uses **Mode-Specific Normalization**. It uses a Variational Gaussian Mixture Model (VGM) to represent continuous values as a one-hot representation indicating the specific cluster mode combined with a normalized scalar value relative to that cluster mode.

### Q2: Why measure Distance to Closest Record (DCR) instead of claiming "100% complete privacy"?
**Answer:** Claiming "100% privacy" is scientifically inaccurate in differential privacy and generative modelling literature. Distance to Closest Record (DCR) measures the Euclidean distance in normalized feature space between each synthetic record and its nearest real training neighbor. A higher average DCR along with 0% exact duplicate matches proves the model has generalized the underlying data distribution without memorizing real individual records.

### Q3: Why is downstream ML utility tested on an independent Real test set?
**Answer:** Testing synthetic-trained classifiers on synthetic test data leads to optimistic over-fitting bias. Reserving an independent 25% real test set $X_{\text{test\_real}}$ guarantees that ML utility metrics (Precision, Recall, F1 Score, ROC-AUC) reflect true real-world generalization performance.

---

*DGen AI — Final Year Bachelor of Engineering Major Project*
