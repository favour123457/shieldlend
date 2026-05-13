

use anchor_lang::prelude::*;
use anchor_lang::solana_program::{program::invoke_signed, system_instruction};
use arcium_anchor::prelude::*;
use arcium_client::idl::arcium::types::CircuitSource;
use arcium_client::idl::arcium::types::OffChainCircuitSource;

// ── Comp def offsets derived from circuit function names ──────────────────────
const COMP_DEF_OFFSET_CHECK_LIQUIDATABLE: u32 = comp_def_offset("check_liquidatable");
const COMP_DEF_OFFSET_APPLY_INTEREST: u32     = comp_def_offset("apply_interest");
const COMP_DEF_OFFSET_VALIDATE_BORROW: u32    = comp_def_offset("validate_borrow");

declare_id!("FY16NSWTr4EX5XhVDkk5xut4MHY95AfhLbWjMmYnfodK");

#[arcium_program]
pub mod shieldlend {
    use super::*;

    // ── Init computation definitions (run once after deploy) ──────────────────

    pub fn init_check_liquidatable_comp_def(
        ctx: Context<InitCheckLiquidatableCompDef>,
    ) -> Result<()> {
        init_comp_def(
            ctx.accounts,
            Some(CircuitSource::OffChain(OffChainCircuitSource {
                source: "https://dwoonbiedwpwwmlknxvn.supabase.co/storage/v1/object/public/check_liquidity/check_liquidatable.arcis".to_string(),
                hash: [0x83, 0xe8, 0xdc, 0x83, 0x84, 0xed, 0x92, 0x4d, 0xdd, 0x32, 0x8b, 0x36, 0xe4, 0x77, 0xb6, 0xce, 0x51, 0x01, 0xe2, 0xe3, 0xdc, 0x52, 0xec, 0x84, 0x31, 0x09, 0xf7, 0xe4, 0x23, 0x30, 0x10, 0x17], // replace after arcium build
            })),
            None,
        )?;
        Ok(())
    }

    pub fn init_apply_interest_comp_def(
        ctx: Context<InitApplyInterestCompDef>,
    ) -> Result<()> {
        init_comp_def(
            ctx.accounts,
            Some(CircuitSource::OffChain(OffChainCircuitSource {
                source: "https://dwoonbiedwpwwmlknxvn.supabase.co/storage/v1/object/public/apply_interest/apply_interest.arcis".to_string(),
                hash: [0x97, 0xb9, 0xc8, 0xc8, 0x49, 0x9c, 0x68, 0x85, 0xe5,
                 0x32, 0x2f, 0x95, 0x8e, 0x1c, 0xf9, 0x07, 0xd8, 0x2e, 0xb3,
                  0x8a, 0x3b, 0x18, 0x4e, 0xb1, 0xa0, 0x1a, 0x35, 0xd2, 0x18,
                   0x90, 0xd2, 0x31], // replace after arcium build
            })),
            None,
        )?;
        Ok(())
    }

    pub fn init_validate_borrow_comp_def(
        ctx: Context<InitValidateBorrowCompDef>,
    ) -> Result<()> {
        init_comp_def(
            ctx.accounts,
            Some(CircuitSource::OffChain(OffChainCircuitSource {
                source: "https://dwoonbiedwpwwmlknxvn.supabase.co/storage/v1/object/public/validate_borrow1/validate_borrow.arcis".to_string(),
                hash: [0xb9, 0x14, 0x97, 0xc3, 0xa0, 0x29, 0x53, 0xb1, 0x13, 0x5e, 0xb8, 0x41, 0xc2, 0xe8, 0x78, 0xdd, 0x93, 0x4b, 0x2f, 0x81, 0x26, 0xae, 0x37, 0x5d, 0xe2, 0x57, 0xba, 0x85, 0x25, 0xa1, 0xb3, 0xe9], // replace after arcium build
            })),
            None,
        )?;
        Ok(())
    }

    // ── Queue computations ────────────────────────────────────────────────────

    pub fn check_liquidatable(
        ctx: Context<CheckLiquidatable>,
        computation_offset: u64,
        collateral: [u8; 32],        // encrypted u64 field of LiquidatableInput
        borrow: [u8; 32],            // encrypted u64 field of LiquidatableInput
        ltv_threshold_bps: u64,      // plaintext
        pubkey: [u8; 32],            // x25519 pubkey for result re-encryption
        nonce: u128,
    ) -> Result<()> {
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

        let args = ArgBuilder::new()
            .x25519_pubkey(pubkey)
            .plaintext_u128(nonce)
            .encrypted_u64(collateral)
            .encrypted_u64(borrow)
            .plaintext_u64(ltv_threshold_bps)
            .build();

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            vec![CheckLiquidatableCallback::callback_ix(
                computation_offset,
                &ctx.accounts.mxe_account,
                &[],
            )?],
            1,
            0,
        )?;
        Ok(())
    }

    pub fn apply_interest(
        ctx: Context<ApplyInterest>,
        computation_offset: u64,
        collateral: [u8; 32],        // encrypted u64
        borrow: [u8; 32],            // encrypted u64
        interest_rate_bps: u64,      // plaintext
        time_slots: u64,             // plaintext
        pubkey: [u8; 32],
        nonce: u128,
    ) -> Result<()> {
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

        let args = ArgBuilder::new()
            .x25519_pubkey(pubkey)
            .plaintext_u128(nonce)
            .encrypted_u64(collateral)
            .encrypted_u64(borrow)
            .plaintext_u64(interest_rate_bps)
            .plaintext_u64(time_slots)
            .build();

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            vec![ApplyInterestCallback::callback_ix(
                computation_offset,
                &ctx.accounts.mxe_account,
                &[],
            )?],
            1,
            0,
        )?;
        Ok(())
    }

    pub fn validate_borrow(
        ctx: Context<ValidateBorrow>,
        computation_offset: u64,
        collateral: [u8; 32],        // encrypted u64
        existing_borrow: [u8; 32],   // encrypted u64
        requested_borrow: [u8; 32],  // encrypted u64
        max_ltv_bps: u64,            // plaintext
        pubkey: [u8; 32],
        nonce: u128,
    ) -> Result<()> {
        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

        let args = ArgBuilder::new()
            .x25519_pubkey(pubkey)
            .plaintext_u128(nonce)
            .encrypted_u64(collateral)
            .encrypted_u64(existing_borrow)
            .encrypted_u64(requested_borrow)
            .plaintext_u64(max_ltv_bps)
            .build();

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            vec![ValidateBorrowCallback::callback_ix(
                computation_offset,
                &ctx.accounts.mxe_account,
                &[],
            )?],
            1,
            0,
        )?;
        Ok(())
    }

    // ── Vault transfer after successful frontend MPC validation ───────────────
    //
    // This instruction demonstrates program-controlled vault payout. The frontend
    // calls this only after validate_borrow returns true from Arcium MPC.
    //
    // Production note: the program should persist the MPC validation result in
    // an on-chain position account before allowing this transfer.
    pub fn borrow_payout(ctx: Context<BorrowPayout>, amount: u64) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidAmount);

        let vault_lamports = ctx.accounts.vault.to_account_info().lamports();
        require!(vault_lamports >= amount, ErrorCode::VaultInsufficientFunds);

        let vault_bump = ctx.bumps.vault;
        let signer_seeds: &[&[u8]] = &[b"vault", &[vault_bump]];

        invoke_signed(
            &system_instruction::transfer(
                ctx.accounts.vault.key,
                ctx.accounts.borrower.key,
                amount,
            ),
            &[
                ctx.accounts.vault.to_account_info(),
                ctx.accounts.borrower.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            &[signer_seeds],
        )?;

        emit!(BorrowPayoutEvent {
            borrower: ctx.accounts.borrower.key(),
            amount,
        });

        Ok(())
    }

    // ── Callbacks (invoked by Arcium MPC nodes) ───────────────────────────────

    #[arcium_callback(encrypted_ix = "check_liquidatable")]
    pub fn check_liquidatable_callback(
        ctx: Context<CheckLiquidatableCallback>,
        output: SignedComputationOutputs<CheckLiquidatableOutput>,
    ) -> Result<()> {
        let o = match output.verify_output(
            &ctx.accounts.cluster_account,
            &ctx.accounts.computation_account,
        ) {
            Ok(CheckLiquidatableOutput { field_0 }) => field_0,
            Err(_) => return Err(ErrorCode::AbortedComputation.into()),
        };

        emit!(LiquidatableResultEvent {
            result: o.ciphertexts[0],
            nonce: o.nonce.to_le_bytes(),
        });
        Ok(())
    }

    #[arcium_callback(encrypted_ix = "apply_interest")]
    pub fn apply_interest_callback(
        ctx: Context<ApplyInterestCallback>,
        output: SignedComputationOutputs<ApplyInterestOutput>,
    ) -> Result<()> {
        let o = match output.verify_output(
            &ctx.accounts.cluster_account,
            &ctx.accounts.computation_account,
        ) {
            Ok(ApplyInterestOutput { field_0 }) => field_0,
            Err(_) => return Err(ErrorCode::AbortedComputation.into()),
        };

        // LiquidatableInput has 2 fields: collateral (index 0), borrow (index 1)
        emit!(InterestAppliedEvent {
            new_collateral: o.ciphertexts[0],
            new_borrow: o.ciphertexts[1],
            nonce: o.nonce.to_le_bytes(),
        });
        Ok(())
    }

    #[arcium_callback(encrypted_ix = "validate_borrow")]
    pub fn validate_borrow_callback(
        ctx: Context<ValidateBorrowCallback>,
        output: SignedComputationOutputs<ValidateBorrowOutput>,
    ) -> Result<()> {
        let o = match output.verify_output(
            &ctx.accounts.cluster_account,
            &ctx.accounts.computation_account,
        ) {
            Ok(ValidateBorrowOutput { field_0 }) => field_0,
            Err(_) => return Err(ErrorCode::AbortedComputation.into()),
        };

        emit!(BorrowValidatedEvent {
            result: o.ciphertexts[0],
            nonce: o.nonce.to_le_bytes(),
        });
        Ok(())
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Init CompDef Account Structs
// Required fields: payer, mxe_account, comp_def_account,
//                  address_lookup_table, lut_program, arcium_program, system_program
// ═══════════════════════════════════════════════════════════════════════════

#[init_computation_definition_accounts("check_liquidatable", payer)]
#[derive(Accounts)]
pub struct InitCheckLiquidatableCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,

    #[account(mut)]
    /// CHECK: comp_def_account, checked by arcium program.
    pub comp_def_account: UncheckedAccount<'info>,

    #[account(mut, address = derive_mxe_lut_pda!(mxe_account.lut_offset_slot))]
    /// CHECK: address_lookup_table, checked by arcium program.
    pub address_lookup_table: UncheckedAccount<'info>,

    #[account(address = LUT_PROGRAM_ID)]
    /// CHECK: lut_program is the Address Lookup Table program.
    pub lut_program: UncheckedAccount<'info>,

    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[init_computation_definition_accounts("apply_interest", payer)]
#[derive(Accounts)]
pub struct InitApplyInterestCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,

    #[account(mut)]
    /// CHECK: comp_def_account, checked by arcium program.
    pub comp_def_account: UncheckedAccount<'info>,

    #[account(mut, address = derive_mxe_lut_pda!(mxe_account.lut_offset_slot))]
    /// CHECK: address_lookup_table, checked by arcium program.
    pub address_lookup_table: UncheckedAccount<'info>,

    #[account(address = LUT_PROGRAM_ID)]
    /// CHECK: lut_program is the Address Lookup Table program.
    pub lut_program: UncheckedAccount<'info>,

    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[init_computation_definition_accounts("validate_borrow", payer)]
#[derive(Accounts)]
pub struct InitValidateBorrowCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,

    #[account(mut)]
    /// CHECK: comp_def_account, checked by arcium program.
    pub comp_def_account: UncheckedAccount<'info>,

    #[account(mut, address = derive_mxe_lut_pda!(mxe_account.lut_offset_slot))]
    /// CHECK: address_lookup_table, checked by arcium program.
    pub address_lookup_table: UncheckedAccount<'info>,

    #[account(address = LUT_PROGRAM_ID)]
    /// CHECK: lut_program is the Address Lookup Table program.
    pub lut_program: UncheckedAccount<'info>,

    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

// ═══════════════════════════════════════════════════════════════════════════
// Queue Computation Account Structs
// ═══════════════════════════════════════════════════════════════════════════

#[queue_computation_accounts("check_liquidatable", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct CheckLiquidatable<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init_if_needed,
        space = 9,
        payer = payer,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, ArciumSignerAccount>,

    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,

    #[account(mut, address = derive_mempool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: mempool_account, checked by the arcium program.
    pub mempool_account: UncheckedAccount<'info>,

    #[account(mut, address = derive_execpool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: executing_pool, checked by the arcium program.
    pub executing_pool: UncheckedAccount<'info>,

    #[account(mut, address = derive_comp_pda!(computation_offset, mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: computation_account, checked by the arcium program.
    pub computation_account: UncheckedAccount<'info>,

    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_CHECK_LIQUIDATABLE))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,

    #[account(mut, address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Account<'info, Cluster>,

    #[account(mut, address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS)]
    pub pool_account: Account<'info, FeePool>,

    #[account(mut, address = ARCIUM_CLOCK_ACCOUNT_ADDRESS)]
    pub clock_account: Account<'info, ClockAccount>,

    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}

#[queue_computation_accounts("apply_interest", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct ApplyInterest<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init_if_needed,
        space = 9,
        payer = payer,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, ArciumSignerAccount>,

    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,

    #[account(mut, address = derive_mempool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: mempool_account, checked by the arcium program.
    pub mempool_account: UncheckedAccount<'info>,

    #[account(mut, address = derive_execpool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: executing_pool, checked by the arcium program.
    pub executing_pool: UncheckedAccount<'info>,

    #[account(mut, address = derive_comp_pda!(computation_offset, mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: computation_account, checked by the arcium program.
    pub computation_account: UncheckedAccount<'info>,

    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_APPLY_INTEREST))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,

    #[account(mut, address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Account<'info, Cluster>,

    #[account(mut, address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS)]
    pub pool_account: Account<'info, FeePool>,

    #[account(mut, address = ARCIUM_CLOCK_ACCOUNT_ADDRESS)]
    pub clock_account: Account<'info, ClockAccount>,

    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}

#[queue_computation_accounts("validate_borrow", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct ValidateBorrow<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init_if_needed,
        space = 9,
        payer = payer,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, ArciumSignerAccount>,

    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,

    #[account(mut, address = derive_mempool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: mempool_account, checked by the arcium program.
    pub mempool_account: UncheckedAccount<'info>,

    #[account(mut, address = derive_execpool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: executing_pool, checked by the arcium program.
    pub executing_pool: UncheckedAccount<'info>,

    #[account(mut, address = derive_comp_pda!(computation_offset, mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: computation_account, checked by the arcium program.
    pub computation_account: UncheckedAccount<'info>,

    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_VALIDATE_BORROW))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,

    #[account(mut, address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Account<'info, Cluster>,

    #[account(mut, address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS)]
    pub pool_account: Account<'info, FeePool>,

    #[account(mut, address = ARCIUM_CLOCK_ACCOUNT_ADDRESS)]
    pub clock_account: Account<'info, ClockAccount>,

    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}

// ═══════════════════════════════════════════════════════════════════════════
// Vault transfer account structs
// ═══════════════════════════════════════════════════════════════════════════

#[derive(Accounts)]
pub struct BorrowPayout<'info> {
    #[account(mut)]
    pub borrower: Signer<'info>,

    #[account(
        mut,
        seeds = [b"vault"],
        bump,
    )]
    pub vault: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

// ═══════════════════════════════════════════════════════════════════════════
// Callback Account Structs
// Required: arcium_program, comp_def_account, mxe_account,
//           computation_account, cluster_account, instructions_sysvar
// ═══════════════════════════════════════════════════════════════════════════

#[callback_accounts("check_liquidatable")]
#[derive(Accounts)]
pub struct CheckLiquidatableCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,

    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_CHECK_LIQUIDATABLE))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,

    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,

    /// CHECK: computation_account, checked by arcium program.
    pub computation_account: UncheckedAccount<'info>,

    #[account(address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Account<'info, Cluster>,

    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar, checked by the account constraint.
    pub instructions_sysvar: AccountInfo<'info>,
}

#[callback_accounts("apply_interest")]
#[derive(Accounts)]
pub struct ApplyInterestCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,

    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_APPLY_INTEREST))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,

    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,

    /// CHECK: computation_account, checked by arcium program.
    pub computation_account: UncheckedAccount<'info>,

    #[account(address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Account<'info, Cluster>,

    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar, checked by the account constraint.
    pub instructions_sysvar: AccountInfo<'info>,
}

#[callback_accounts("validate_borrow")]
#[derive(Accounts)]
pub struct ValidateBorrowCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,

    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_VALIDATE_BORROW))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,

    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,

    /// CHECK: computation_account, checked by arcium program.
    pub computation_account: UncheckedAccount<'info>,

    #[account(address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Account<'info, Cluster>,

    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar, checked by the account constraint.
    pub instructions_sysvar: AccountInfo<'info>,
}

// ═══════════════════════════════════════════════════════════════════════════
// Events
// ═══════════════════════════════════════════════════════════════════════════

#[event]
pub struct LiquidatableResultEvent {
    pub result: [u8; 32],  // encrypted: 1 = liquidatable, 0 = healthy
    pub nonce: [u8; 16],
}

#[event]
pub struct InterestAppliedEvent {
    pub new_collateral: [u8; 32], // encrypted (unchanged but returned)
    pub new_borrow: [u8; 32],     // encrypted new borrow with interest
    pub nonce: [u8; 16],
}

#[event]
pub struct BorrowValidatedEvent {
    pub result: [u8; 32],  // encrypted: 1 = valid, 0 = would breach LTV
    pub nonce: [u8; 16],
}

#[event]
pub struct BorrowPayoutEvent {
    pub borrower: Pubkey,
    pub amount: u64,
}

// ═══════════════════════════════════════════════════════════════════════════
// Errors
// ═══════════════════════════════════════════════════════════════════════════

#[error_code]
pub enum ErrorCode {
    #[msg("Computation was aborted or tampered with")]
    AbortedComputation,
    #[msg("No Arcium cluster assigned yet")]
    ClusterNotSet,
    #[msg("Amount must be greater than zero")]
    InvalidAmount,
    #[msg("Vault does not have enough SOL for this payout")]
    VaultInsufficientFunds,
}
