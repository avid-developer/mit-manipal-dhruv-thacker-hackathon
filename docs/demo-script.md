# SignalHarbor demonstration

Edited captures of the working application, with synthesized narration. AI assistance is disclosed. No real participant voice or likeness is synthesized.

## 1. SignalHarbor | Dhruv Thacker, MIT Manipal

This is SignalHarbor, Dhruv Thacker’s submission for the S and P Global and Crisil Campus Hackathon. It turns news and community text into an inspectable risk signal, then explores a hypothetical portfolio impact. This edited walkthrough uses captures of the working application and synthesized narration. The default replay contains fictional examples. Fourteen inputs become thirteen unique signals, three stress triggers, and six items requiring review.

## 2. Reproduce the prototype

The public repository includes all code, datasets, a seven slide presentation, and an M I T license. With Node version twenty two or newer, run npm start and open localhost on port eighty seven eighty seven. No package installation or API key is needed. The same original JavaScript engine runs in the browser and the Node API. JSON outputs preserve the evidence behind each decision.

## 3. From text to a structured signal

This fictional geopolitical report contains war, sanctions, invasion, and a shipping blockade. The engine assigns negative sentiment, the geopolitical class, and severity ten. A multinomial Naive Bayes classifier learns unigram and bigram features from eighty four synthetic examples. Sentiment uses a financial lexicon with local negation. Severity is an explicit heuristic. Contributing terms and machine readable output stay visible. Model scores are uncalibrated, not probabilities of market outcomes.

## 4. Module B: portfolio stress testing

The selected signal passes the automatic trigger: severity above seven, negative sentiment, and no review flag. Module B applies transparent shocks to eleven synthetic positions across loans, bonds, derivatives, and equity. At severity ten, the one hundred million dollar portfolio falls to ninety two point three two million. The seven point six eight million loss combines rate, spread, equity, and loan credit effects. These are scenario assumptions, not forecasts.

## 5. Interactive severity scaling

Moving the severity slider from ten to five scales the shocks and halves the loss to three point eight four million dollars. The rate shock becomes thirty seven point five basis points. Each scenario starts from the original baseline. Events do not compound the losses, and the interface marks the analyst override. The rate hedge is included with its correct signed contribution.

## 6. Issuer-specific exposure

Switching to the Aster credit event changes the scope to matching issuer positions. The stressed portfolio value is approximately ninety six point two million dollars. Unrelated issuers remain unchanged. A pay fixed rate swap can gain when rates rise, even while other exposures lose value. An unmatched issuer produces a warning and zero issuer specific loss.

## 7. Test a new report

The monitor also accepts new text. Here the input is an unconfirmed rumor that Harbor Logistics could be hit by ransomware, with the source set to a social post. This tests uncertainty handling alongside the core event extraction.

## 8. Review before acting

The result is a cyber or operational event with negative sentiment. Qualified wording caps severity at seven. The report is flagged for human review because it is unconfirmed and comes from a social source. It does not create an automatic stress trigger. Users can still explore a clearly identified hypothetical scenario.

## 9. Two live public sources

Live mode polls official Federal Reserve news and Hacker News community story titles. This run returned twelve records from each source. Publication times and source links are retained. All twenty four current records require review and none triggers stress. A network error is displayed explicitly; synthetic records never replace a failed live source. The static hosted demo supports replay and analysis, while live polling requires the local Node server.

## 10. Measured results and honest limits

Twenty two functional and H T T P tests passed. The event model correctly classifies all twenty eight supplied diagnostic examples, but both training and evaluation are small, synthetic, and from the same author and domain. This does not establish real news accuracy. Local engine p ninety five latency was zero point four zero seven milliseconds, excluding networking and rendering. Next steps are independent finance data, calibrated uncertainty, better entity linking, and full instrument repricing. AI assistance is disclosed in the repository. The code and presentation make every result reproducible and reviewable.
