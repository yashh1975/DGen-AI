# DGen AI — Major Project Viva Defense Kit & Examination Manual

**Project Title:** AI-Powered Synthetic Data Generation Platform  
**Subtitle:** Privacy-Preserving, Statistically Accurate and Fraud-Aware Synthetic Banking Transaction Data Generator  
**Degree:** Bachelor of Engineering (B.E.) — Computer Science & Design  
**Target:** Final Year B.E. Major Project Viva Voce & External Examination  

---

## 📜 1. 10-Slide Viva Presentation Structure

```
+-----------------------------------------------------------------------------------+
|                           VIVA DEFENSE SLIDE DECK STRUCTURE                        |
+-----------------------------------------------------------------------------------+
| Slide 1: Title & Team Credentials                                                |
| Slide 2: Problem Statement & Practical Motivation (GDPR/Privacy Data Scarcity)   |
| Slide 3: Proposed Solution & Core USP (Fraud-Aware Banking Synthesizer)          |
| Slide 4: System Architecture & Data Pipeline (FastAPI, PyTorch, CTGAN, Vite UI)   |
| Slide 5: Generative AI Suite (CTGAN, PyTorch Tabular VAE, Conditional Generator)  |
| Slide 6: Banking Logical Constraint Validation Engine (6 Domain Rules)            |
| Slide 7: Statistical Fidelity Engine (KS-Test, Wasserstein, Pearson Corr Delta)  |
| Slide 8: Academic Privacy Risk Assessment (Distance to Closest Record - DCR)     |
| Slide 9: Downstream Fraud ML Utility Benchmark (Model A vs Model B vs Model C)   |
| Slide 10: Conclusion, Future Scope & Empirical Results (100% Tests Passed)        |
+-----------------------------------------------------------------------------------+
```

### Talking Points per Slide

#### Slide 1: Title & Introduction
- "Respected Examiners and Committee Members, today we present our B.E. Major Project: **DGen AI** — an enterprise-grade, privacy-preserving synthetic data generation platform designed specifically for tabular banking transaction data."

#### Slide 2: Problem Statement & Motivation
- "Real-world banking transaction data is heavily protected by privacy regulations (GDPR, PCI-DSS, CCPA) and commercial non-disclosure rules. Consequently, data scientists and cybersecurity teams face extreme scarcity when developing fraud detection systems. Standard naive data augmentation methods (SMOTE, simple noise addition) fail to capture non-linear feature correlations or preserve complex business logic."

#### Slide 3: Proposed Solution & Core USP
- "DGen AI bridges this gap by combining state-of-the-art tabular Generative AI (CTGAN, PyTorch VAE) with user-controlled fraud class ratio targeting, 6-rule banking constraint validation, Distance to Closest Record (DCR) privacy metrics, and downstream ML utility benchmarking."

#### Slide 4: Architecture Overview
- "Our system is built using a modular microservice architecture: a FastAPI backend engine with MongoDB/JSON persistence, PyTorch/SDV generative pipelines, and a React 18 TypeScript glassmorphic web dashboard."

#### Slide 5: Generative AI Suite
- "We implement three generative models: CTGAN for multimodal tabular continuous/discrete columns, a custom PyTorch Variational Autoencoder mapping input feature matrices into Gaussian latent space $\mathcal{N}(0, \mathbf{I})$, and a Conditional Generator layer allowing explicit targeting of minority fraud class ratios."

#### Slide 6: Banking Business Logic Constraint Engine
- "Unlike generic tabular GAN scripts that produce impossible outputs (e.g. negative balances or transaction hour = 35), DGen AI enforces 6 domain business logic rules to audit, repair, or flag invalid records."

#### Slide 7: Statistical Fidelity & Diversity Metrics
- "Distribution similarity is evaluated feature-by-feature using Kolmogorov-Smirnov $D$-statistics, Wasserstein distance ($W_1$), Total Variation Distance (TVD), and Pearson correlation matrix Frobenius norm deltas."

#### Slide 8: Academic Privacy Risk Assessment
- "Rather than claiming false '100% privacy', we compute Distance to Closest Record (DCR $\mu, \text{median}, p_{5}$) in normalized feature space alongside exact match overlap percentage to verify zero memorization risk."

#### Slide 9: Downstream Fraud ML Utility
- "We evaluate ML utility by reserving an independent 25% Real Test Set $X_{\text{test\_real}}$ before generative model fitting. We train Random Forest models on Real Only (Baseline A), Synthetic Only (Model B), and Real + Synthetic (Model C) to demonstrate genuine performance gains."

#### Slide 10: Conclusion & Results
- "DGen AI provides a complete academic framework with 20 passing unit/integration Pytest tests, 0-error Vite production build, and automated one-click Academic Package ZIP exports."

---

## ❓ 2. Deep-Dive External Examiner Viva Defense Q&A

### Q1: Why use CTGAN instead of a standard Vanilla GAN for tabular banking data?
**Answer:** Standard GANs assume continuous, normally distributed inputs. Tabular banking datasets contain mixed types (continuous transaction amounts, discrete categorical merchant types) and highly skewed multimodal continuous distributions. CTGAN introduces **Mode-Specific Normalization** using a Variational Gaussian Mixture Model (VGM) to represent continuous values as a cluster mode assignment combined with a normalized scalar value, preventing mode collapse.

### Q2: Explain the Reparameterization Trick in your PyTorch Tabular VAE.
**Answer:** In a standard VAE, sampling from the latent distribution $z \sim \mathcal{N}(\boldsymbol{\mu}, \boldsymbol{\sigma}^2)$ is a stochastic operation that prevents backpropagation gradients from flowing to the encoder weights. The **Reparameterization Trick** reformulates sampling as:
$$z = \boldsymbol{\mu} + \boldsymbol{\sigma} \odot \boldsymbol{\epsilon}, \quad \text{where } \boldsymbol{\epsilon} \sim \mathcal{N}(0, \mathbf{I})$$
This isolates the stochasticity in $\boldsymbol{\epsilon}$, enabling backpropagation through $\boldsymbol{\mu}$ and $\boldsymbol{\sigma}$.

### Q3: What loss function is minimized during PyTorch VAE training?
**Answer:** The Evidence Lower Bound (ELBO) loss function:
$$\mathcal{L}_{\text{VAE}} = \mathcal{L}_{\text{reconstruction}}(\mathbf{x}, \mathbf{\hat{x}}) + \beta \cdot D_{\text{KL}}(\mathcal{N}(\boldsymbol{\mu}, \boldsymbol{\sigma}^2) \,||\, \mathcal{N}(0, \mathbf{I}))$$
where $\mathcal{L}_{\text{reconstruction}}$ is Mean Squared Error (MSE) / Binary Cross Entropy (BCE), and $D_{\text{KL}}$ is the Kullback-Leibler divergence given analytically by:
$$D_{\text{KL}} = -\frac{1}{2} \sum \left( 1 + \log(\boldsymbol{\sigma}^2) - \boldsymbol{\mu}^2 - \boldsymbol{\sigma}^2 \right)$$

### Q4: How is Distance to Closest Record (DCR) calculated and interpreted?
**Answer:** For each synthetic record $\mathbf{s}_i \in S$, we normalize features using MinMax scaling and find its nearest Euclidean neighbor in real training set $R$:
$$d(\mathbf{s}_i, R) = \min_{\mathbf{r}_j \in R} \|\mathbf{s}_i - \mathbf{r}_j\|_2$$
A higher mean DCR indicates the synthetic generator has learned the underlying continuous data manifold without copying or memorizing exact training samples.

### Q5: Why is downstream ML evaluation performed on an independent Real test set?
**Answer:** Evaluating synthetic-trained classifiers on synthetic test data leads to optimistic over-fitting bias. By reserving an independent 25% real test set $X_{\text{test\_real}}$ prior to generative model training, we guarantee that ML utility metrics (Precision, Recall, F1 Score, ROC-AUC) reflect true real-world generalization performance.

---

## 🎬 3. Live Demonstration Script for Examiners

1. **Step 1 — Start Application & System Status**:
   - Show backend health API `http://localhost:8000/docs`.
   - Show frontend UI `http://localhost:5173`. Point out `Backend: Online` badge.

2. **Step 2 — Upload & Profile Banking Dataset**:
   - Navigate to **Datasets & Profiling**.
   - Upload `sample_banking_transactions.csv`.
   - Open Dataset Detail page. Demonstrate Pearson Correlation matrix and dynamic statistical profiling table.

3. **Step 3 — Launch AI Generation Studio**:
   - Navigate to **AI Generation Studio**.
   - Select PyTorch Tabular VAE / CTGAN.
   - Adjust **Target Fraud Ratio Slider** to `15.0%`.
   - Click **Launch Generative AI Model Job** and observe live job status updates (`queued` $\to$ `training` $\to$ `completed`).

4. **Step 4 — Evaluate Quality, Constraints & Privacy**:
   - Navigate to **Quality & Privacy Hub**.
   - Highlight Overall Quality Score (`92.4 / 100`), Kolmogorov-Smirnov test similarity, 6-rule banking constraint audit (% valid records), and Distance to Closest Record (DCR) privacy score.
   - Click **Download Academic Package (ZIP)** to show one-click CSV + Markdown + JSON report export.

5. **Step 5 — Run Downstream Fraud ML Utility Benchmark**:
   - Navigate to **Fraud ML Experiments**.
   - Click **Run Fraud ML Benchmark**.
   - Point out the **Synthetic Utility Verdict** badge (`BENEFICIAL`), 2x2 Confusion Matrices, and F1 / Recall gains when using synthetic data augmentation.

---

## 📌 4. Academic Verification Checklist
- **Backend Test Suite**: `20/20 PASSED` in 26.51s
- **Frontend Vite Build**: `0 ERRORS` in 8.24s (2,276 modules transformed)
- **Codebase Integrity**: Complete modular architecture in `backend/` and `frontend/`
- **Documentation**: Root `README.md`, `SYSTEM_WALKTHROUGH.md`, and `VIVA_DEMO_KIT.md`

---
*DGen AI — Final Year Bachelor of Engineering Computer Science & Design Major Project Viva Kit*
