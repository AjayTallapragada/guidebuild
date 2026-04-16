# Final Submission Package

## Public demo video checklist
- Record a 5-minute screen capture starting from worker login.
- Buy a prepaid policy such as `Storm Runner`.
- Open `Claims` and simulate a weather disruption with low GPS drift so the AI recommends `approve_fast`.
- Show the created claim with fraud score, historical-weather check, and AI recommendation.
- Open `Payouts` and release the queued amount through `UPI Simulator`, `Razorpay Test`, or `Stripe Sandbox`.
- Log in as admin and open `Dashboard` to show loss ratio, flagged claims, and next-week prediction.
- End with the admin reviewing a high-fraud scenario by increasing GPS drift or exaggerating weather severity.

## Demo narrative
1. ParcelShield AI protects delivery workers against weather, delay, and accident shocks using weekly parametric cover.
2. Claims can be triggered manually for demos or automatically through the sweep endpoint.
3. The fraud engine checks GPS spoofing, speed outliers, missing proof, and weather mismatch against a historical baseline.
4. Low-risk claims are approved instantly and become eligible for simulated wage payout.
5. Admins get predictive analytics on loss ratios and next week's likely disruption pattern.

## Judging artefacts included in repo
- Product README with setup and deployment notes.
- Railway config for backend hosting.
- Pitch deck outline in `docs/PITCH_DECK_OUTLINE.md`.
- Demo script in `docs/FINAL_SUBMISSION_PACKAGE.md`.
