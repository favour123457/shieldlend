use arcis::*;

#[encrypted]
mod circuits {
    use arcis::*;

    pub struct LiquidatableInput {
        pub collateral: u64,
        pub borrow: u64,
    }

    pub struct ValidateBorrowInput {
        pub collateral: u64,
        pub existing_borrow: u64,
        pub requested_borrow: u64,
    }

    // ─────────────────────────────────────────────
    // Circuit 1: Check if a position is liquidatable
    // Inputs:  encrypted input (LiquidatableInput), plaintext threshold
    // ─────────────────────────────────────────────
    #[instruction]
    pub fn check_liquidatable(
        input: Enc<Shared, LiquidatableInput>,
        ltv_threshold_bps: u64, // plaintext, e.g. 8000 = 80%
    ) -> Enc<Shared, u64> {
        let d = input.to_arcis();

        let scaled_borrow = d.borrow * 10000u64;
        let threshold_value = d.collateral * ltv_threshold_bps;

        let is_liquidatable = if scaled_borrow >= threshold_value {
            1u64
        } else {
            0u64
        };

        input.owner.from_arcis(is_liquidatable)
    }

    // ─────────────────────────────────────────────
    // Circuit 2: Apply simple interest to borrow amount
    // Inputs:  encrypted state (LiquidatableInput), interest_rate_bps, time_slots
    // ─────────────────────────────────────────────
    #[instruction]
    pub fn apply_interest(
        input: Enc<Shared, LiquidatableInput>,
        interest_rate_bps: u64, // annual rate in bps, e.g. 500 = 5%
        time_slots: u64,        // slots elapsed since last update
    ) -> Enc<Shared, LiquidatableInput> {
        let d = input.to_arcis();

        // Approximate: 1 slot ≈ 0.4s, ~78,840,000 slots/year
        // We reorder to prevent overflow while keeping precision
        let interest = (d.borrow * interest_rate_bps) / 10000u64 * time_slots / 78_840_000u64;
        
        let new_state = LiquidatableInput {
            collateral: d.collateral,
            borrow: d.borrow + interest,
        };

        input.owner.from_arcis(new_state)
    }

    // ─────────────────────────────────────────────
    // Circuit 3: Validate borrow request
    // Inputs:  encrypted input (ValidateBorrowInput), plaintext threshold
    // ─────────────────────────────────────────────
    #[instruction]
    pub fn validate_borrow(
        input: Enc<Shared, ValidateBorrowInput>,
        max_ltv_bps: u64, // e.g. 7500 = 75%
    ) -> Enc<Shared, u64> {
        let d = input.to_arcis();

        let total_borrow = d.existing_borrow + d.requested_borrow;
        let scaled_borrow = total_borrow * 10000u64;
        let threshold = d.collateral * max_ltv_bps;

        let is_valid = if scaled_borrow <= threshold {
            1u64
        } else {
            0u64
        };

        input.owner.from_arcis(is_valid)
    }
}
