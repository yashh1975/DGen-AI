# DGen AI — System Demonstration & Evaluation Walkthrough Manual

**Project Title:** AI-Powered Synthetic Data Generation Platform  
**Academic Target:** Bachelor of Engineering (B.E.) Computer Science & Design Major Project Demonstration  

---

## 🎯 Demonstration Objective
This guide provides a step-by-step manual for demonstrating the **DGen AI** platform to project examiners, evaluation committees, and faculty reviewers.

---

## 📌 Step-by-Step Demonstration Manual

### Step 1: Platform Overview & System Health Check
1. Open your browser and navigate to `http://localhost:5173`.
2. Observe the top navigation header status badge:
   - **Backend:** `Online`
   - **Database Mode:** `MongoDB` (or `Mock Store (JSON)`)
3. Point out the dark/glassmorphic interface design built with Tailwind CSS, Lucide icons, and Recharts.

---

### Step 2: Dataset Upload & Dynamic Profiling Studio
1. Click on **Datasets & Profiling** in the navigation header.
2. In the Drag-and-Drop file dropzone, upload the provided sample dataset `data/sample_banking_transactions.csv` (2,500 records).
3. Click on the uploaded dataset card to open the **Dataset Profile & Preprocessing Studio**:
   - **Summary KPIs**: Total Records (2,500), Total Features (10), Categorical Columns count, Numerical Columns count.
   - **Numerical Feature Statistics**: Mean, Std Dev, Min, Median, Max metrics table for `amount`, `balance_before`, `balance_after`, `age`, `transaction_hour`.
   - **Categorical Frequencies**: Distribution breakdown for `transaction_type`, `merchant_category`, `payment_method`.
   - **Pearson Correlation Matrix Grid**: Color-coded correlation grid highlighting feature relationships.
   - **Preprocessing Studio**: Demonstrate median/mean imputation, minmax/standard scaling, and label encoding preview.

---

### Step 3: AI Generation Studio
1. Click on **AI Generation Studio** in the navigation header.
2. Select the uploaded dataset (`sample_banking_transactions.csv`).
3. Select a Generative AI Model Architecture:
   - **CTGAN Synthesizer**: Deep Tabular GAN leveraging SDV for multimodal continuous features.
   - **PyTorch Tabular VAE**: Variational Autoencoder mapping input feature matrices into Gaussian latent space $\mathcal{N}(0, \mathbf{I})$.
   - **Conditional Class Generator**: Enable the **Target Fraud Ratio Slider** (e.g. set to `15.0%` fraud target rate).
4. Configure requested records count (e.g., `2,000` synthetic records) and random seed (`42`).
5. Click **Launch Generative AI Model Job**:
   - Observe the live polling job status tracker transitioning from `queued` $\to$ `training` $\to$ `generating` $\to$ `completed`.
   - Click **Download Synthetic Dataset (CSV)** to inspect the generated synthetic file.

---

### Step 4: Quality & Privacy Evaluation Hub
1. Click on **Quality & Privacy Hub** in the navigation header.
2. Select the completed synthetic job from the dropdown menu.
3. Review the **Multi-Dimensional Quality Scorecard**:
   - **Overall Quality Score Badge**: Aggregated weighted quality index (e.g., `92.4 / 100`).
   - **Statistical Fidelity Score Card**: Average KS-test similarity score & Pearson correlation matrix delta.
   - **Logical Validity Card**: Percentage of synthetic records satisfying all 6 banking business rules (% valid records).
   - **Diversity Score Card**: Percentage of unique patterns & exact duplicate row count.
   - **Academic Privacy Risk Badge**: Displays `LOW_RISK` rating, Distance to Closest Record (DCR mean distance), and 0% exact duplicate overlap with real training records.
4. Review the **Numerical Feature Kolmogorov-Smirnov (KS) Test Metrics Table** displaying $D$-statistic, Wasserstein distance, and mean deltas for every feature.

---

### Step 5: Downstream Fraud ML Utility Studio
1. Click on **Fraud ML Experiments** in the navigation header.
2. Select the synthetic generation job.
3. Click **Run Fraud ML Benchmark**:
   - The platform splits the real dataset to reserve an independent 25% test set $X_{\text{test\_real}}$.
   - Trains 3 Random Forest classifiers:
     - **Model A (Real Data Only)**
     - **Model B (Synthetic Data Only)**
     - **Model C (Real + Synthetic Data)**
4. Inspect the **Downstream ML Utility Assessment**:
   - Observe the **Synthetic Utility Verdict** badge (`BENEFICIAL`).
   - Inspect the $2 \times 2$ Confusion Matrices for True Positives, False Positives, False Negatives, and True Negatives.
5. Review the **Generative AI Model Benchmark Matrix** comparing CTGAN vs PyTorch VAE vs Conditional Model side-by-side.

---

## 🛠️ Verification Checklist for Examiners

- [x] Backend FastAPI Server running without errors (`http://localhost:8000/docs`)
- [x] Frontend React Vite Application compiled with 0 errors (`http://localhost:5173`)
- [x] All 18 Pytest unit and integration tests passing (`python -m pytest`)
- [x] Synthetic CSV files generated and stored in `storage/datasets/`
