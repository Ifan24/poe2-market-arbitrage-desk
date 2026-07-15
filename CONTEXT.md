# POE2 Market Desk

Domain language for the Path of Exile 2 market arbitrage dashboard and its market-history features.

## Language

**Historical Snapshot**:
One hourly market state for one league. Historical snapshots are append-only observations and should not be mixed across leagues.
_Avoid_: Trend point, old JSON, archived data

**Trend Index**:
A derived market-history artifact computed from multiple historical snapshots for one league. It summarizes movement, stability, liquidity, and other time-based signals without replacing the current market snapshot.
_Avoid_: Trend data, analytics blob, history file

**Confidence Signal**:
A compact trend-derived label or score that helps users judge whether a current opportunity is stable, noisy, spiking, volatile, or thinly traded. Confidence signals improve current-route decisions; they are not a separate historical report.
_Avoid_: Chart metric, prediction, guarantee

**Profit Persistence**:
A confidence signal that counts how often the same opportunity remained profitable across a recent window, such as 24 hours or 7 days. It measures consistency, not future performance.
_Avoid_: Win rate, prediction accuracy, guaranteed profit

**Route Opportunity**:
A league-scoped opportunity identified by target item, buy currency, and sell currency. Trend features should compare route opportunities across historical snapshots rather than comparing item names alone.
_Avoid_: Item opportunity, target-only trend, name-based route

**Flip Candidate**:
An item or route with signals that may justify manual same-currency flip investigation. A flip candidate is not a confirmed executable trade because the app does not have full in-game order-book depth.
_Avoid_: Guaranteed flip, confirmed flip, arbitrage
