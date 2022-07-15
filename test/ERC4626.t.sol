// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity >=0.8.10;

import "forge-std/Test.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

import {MockERC20} from "./MockERC20.sol";
import {MockERC4626} from "./MockERC4626.sol";

contract ERC4626Test is Test {
    MockERC20 underlying;
    MockERC4626 vault;

    function setUp() public {
        underlying = new MockERC20("Mock Token", "TKN");
        
        address[] memory defaultOperators;
        vault = new MockERC4626(IERC20Upgradeable(address(underlying)), "Mock Token Vault", "vwTKN", defaultOperators);
    }

    function invariantMetadata() public {
        assertEq(vault.name(), "Mock Token Vault");
        assertEq(vault.symbol(), "vwTKN");
        assertEq(vault.decimals(), 18);
    }

    function testMetadata(string calldata name, string calldata symbol) public {
        address[] memory defaultOperators;
        MockERC4626 vlt = new MockERC4626(IERC20Upgradeable(address(underlying)), name, symbol, defaultOperators);

        assertEq(vlt.name(), name);
        assertEq(vlt.symbol(), symbol);
        assertEq(address(vlt.asset()), address(underlying));
    }

    function testSingleDepositWithdraw(uint96 _depositAmount, uint96 _depositAlowance, uint128 _keepInBalance) public {
        vm.assume(_depositAmount > 0);
        vm.assume(_depositAlowance >= _depositAmount);

        // prevent overflow
        uint256 depositAmount = _depositAmount;
        uint256 keepInBalance = _keepInBalance;
        uint256 depositAlowance = _depositAlowance;

        address alice = address(0xABCD);

        underlying.mint(alice, depositAlowance + keepInBalance);

        vm.prank(alice); 
        underlying.approve(address(vault), depositAlowance);
        assertEq(underlying.allowance(alice, address(vault)), depositAlowance);

        uint256 alicePreDepositBal = underlying.balanceOf(alice);
        uint256 expectedShares = vault.previewDeposit(depositAmount);
        assertEq(vault.convertToShares(depositAmount), expectedShares);

        vm.prank(alice);
        uint256 aliceShareAmount = vault.deposit(depositAmount, alice);

        assertEq(expectedShares, aliceShareAmount);
        assertEq(vault.afterDepositHookCalledCounter(), 1);
        assertEq(vault.beforeWithdrawHookCalledCounter(), 0);
        // Expect exchange rate to be 1:1 on initial deposit.
        assertEq(depositAmount, aliceShareAmount);
        assertEq(vault.previewWithdraw(depositAmount), aliceShareAmount);
        assertEq(vault.previewRedeem(aliceShareAmount), depositAmount);
        assertEq(vault.previewDeposit(depositAmount), aliceShareAmount);
        assertEq(vault.previewMint(aliceShareAmount), depositAmount);
        assertEq(vault.totalSupply(), aliceShareAmount);
        assertEq(vault.totalAssets(), depositAmount);
        assertEq(vault.balanceOf(alice), aliceShareAmount);
        assertEq(vault.convertToAssets(vault.balanceOf(alice)), depositAmount);
        assertEq(vault.convertToShares(depositAmount), vault.balanceOf(alice));
        assertEq(underlying.balanceOf(alice), alicePreDepositBal - depositAmount);
        assertEq(underlying.balanceOf(address(vault)), depositAmount);

        vm.prank(alice);
        vault.withdraw(depositAmount, alice, alice);

        assertEq(vault.afterDepositHookCalledCounter(), 1);
        assertEq(vault.beforeWithdrawHookCalledCounter(), 1);

        assertEq(vault.totalAssets(), 0);
        assertEq(vault.totalSupply(), 0);
        assertEq(vault.balanceOf(alice), 0);
        assertEq(vault.convertToAssets(vault.balanceOf(alice)), 0);
        assertEq(underlying.balanceOf(alice), alicePreDepositBal);
        assertEq(underlying.balanceOf(address(vault)), 0);
    }

    function testSingleMintRedeem(uint96 _shareAmount, uint96 _depositAlowance, uint128 _keepInBalance) public {
        vm.assume(_shareAmount > 0);
        vm.assume(_depositAlowance >= _shareAmount);

        // prevent overflow
        uint256 shareAmount = _shareAmount;
        uint256 keepInBalance = _keepInBalance;
        uint256 depositAlowance = _depositAlowance;

        address alice = address(0xABCD);

        underlying.mint(alice, shareAmount + keepInBalance);

        vm.prank(alice);
        underlying.approve(address(vault), depositAlowance);
        assertEq(underlying.allowance(alice, address(vault)), depositAlowance);

        uint256 alicePreDepositBal = underlying.balanceOf(alice);
        uint256 expectedUnderlying = vault.previewMint(shareAmount);
        assertEq(vault.convertToAssets(shareAmount), expectedUnderlying);

        vm.prank(alice);
        uint256 aliceUnderlyingAmount = vault.mint(shareAmount, alice);

        assertEq(aliceUnderlyingAmount, expectedUnderlying);
        assertEq(vault.afterDepositHookCalledCounter(), 1);
        assertEq(vault.beforeWithdrawHookCalledCounter(), 0);
        // Expect exchange rate to be 1:1 on initial mint.
        assertEq(shareAmount, aliceUnderlyingAmount);
        assertEq(vault.previewWithdraw(aliceUnderlyingAmount), shareAmount);
        assertEq(vault.previewRedeem(shareAmount), aliceUnderlyingAmount);
        assertEq(vault.previewDeposit(aliceUnderlyingAmount), shareAmount);
        assertEq(vault.previewMint(shareAmount), aliceUnderlyingAmount);
        assertEq(vault.totalSupply(), shareAmount);
        assertEq(vault.totalAssets(), aliceUnderlyingAmount);
        assertEq(vault.balanceOf(alice), shareAmount);
        assertEq(vault.convertToAssets(vault.balanceOf(alice)), aliceUnderlyingAmount);
        assertEq(vault.convertToShares(aliceUnderlyingAmount), vault.balanceOf(alice));
        assertEq(underlying.balanceOf(alice), alicePreDepositBal - aliceUnderlyingAmount);
        assertEq(underlying.balanceOf(address(vault)), aliceUnderlyingAmount);

        vm.prank(alice);
        vault.redeem(shareAmount, alice, alice);

        assertEq(vault.afterDepositHookCalledCounter(), 1);
        assertEq(vault.beforeWithdrawHookCalledCounter(), 1);

        assertEq(vault.totalAssets(), 0);
        assertEq(vault.totalSupply(), 0);
        assertEq(vault.balanceOf(alice), 0);
        assertEq(vault.convertToAssets(vault.balanceOf(alice)), 0);
        assertEq(underlying.balanceOf(alice), alicePreDepositBal);
        assertEq(underlying.balanceOf(address(vault)), 0);
    }

    function testMultipleMintDepositRedeemWithdraw() public {
        // Scenario:
        // A = Alice, B = Bob
        //  ________________________________________________________
        // | Vault shares | A share | A assets | B share | B assets |
        // |========================================================|
        // | 1. Alice mints 2000 shares (costs 2000 tokens)         |
        // |--------------|---------|----------|---------|----------|
        // |         2000 |    2000 |     2000 |       0 |        0 |
        // |--------------|---------|----------|---------|----------|
        // | 2. Bob deposits 4000 tokens (mints 4000 shares)        |
        // |--------------|---------|----------|---------|----------|
        // |         6000 |    2000 |     2000 |    4000 |     4000 |
        // |--------------|---------|----------|---------|----------|
        // | 3. Vault mutates by +3000 tokens...                    |
        // |    (simulated yield returned from strategy)...         |
        // |--------------|---------|----------|---------|----------|
        // |         6000 |    2000 |     3000 |    4000 |     6000 |
        // |--------------|---------|----------|---------|----------|
        // | 4. Alice deposits 2000 tokens (mints 1333 shares)      |
        // |--------------|---------|----------|---------|----------|
        // |         7333 |    3333 |     4999 |    4000 |     6000 |
        // |--------------|---------|----------|---------|----------|
        // | 5. Bob mints 2000 shares (costs 3001 assets)           |
        // |    NOTE: Bob's assets spent got rounded up             |
        // |    NOTE: Alice's vault assets got rounded up           |
        // |--------------|---------|----------|---------|----------|
        // |         9333 |    3333 |     5000 |    6000 |     9000 |
        // |--------------|---------|----------|---------|----------|
        // | 6. Vault mutates by +3000 tokens...                    |
        // |    (simulated yield returned from strategy)            |
        // |    NOTE: Vault holds 17001 tokens, but sum of          |
        // |          assetsOf() is 17000.                          |
        // |--------------|---------|----------|---------|----------|
        // |         9333 |    3333 |     6071 |    6000 |    10929 |
        // |--------------|---------|----------|---------|----------|
        // | 7. Alice redeem 1333 shares (2428 assets)              |
        // |--------------|---------|----------|---------|----------|
        // |         8000 |    2000 |     3643 |    6000 |    10929 |
        // |--------------|---------|----------|---------|----------|
        // | 8. Bob withdraws 2928 assets (1608 shares)             |
        // |--------------|---------|----------|---------|----------|
        // |         6392 |    2000 |     3643 |    4392 |     8000 |
        // |--------------|---------|----------|---------|----------|
        // | 9. Alice withdraws 3643 assets (2000 shares)           |
        // |    NOTE: Bob's assets have been rounded back up        |
        // |--------------|---------|----------|---------|----------|
        // |         4392 |       0 |        0 |    4392 |     8001 |
        // |--------------|---------|----------|---------|----------|
        // | 10. Bob redeem 4392 shares (8001 tokens)               |
        // |--------------|---------|----------|---------|----------|
        // |            0 |       0 |        0 |       0 |        0 |
        // |______________|_________|__________|_________|__________|

        address alice = address(0xABCD);
        address bob = address(0xDCBA);

        uint256 mutationUnderlyingAmount = 3000;

        underlying.mint(alice, 4000);

        vm.prank(alice);
        underlying.approve(address(vault), 4000);

        assertEq(underlying.allowance(alice, address(vault)), 4000);

        underlying.mint(bob, 7001);

        vm.prank(bob);
        underlying.approve(address(vault), 7001);

        assertEq(underlying.allowance(bob, address(vault)), 7001);

        // 1. Alice mints 2000 shares (costs 2000 tokens)
        vm.prank(alice);
        uint256 aliceUnderlyingAmount = vault.mint(2000, alice);

        uint256 aliceShareAmount = vault.previewDeposit(aliceUnderlyingAmount);
        assertEq(vault.afterDepositHookCalledCounter(), 1);

        // Expect to have received the requested mint amount.
        assertEq(aliceShareAmount, 2000);
        assertEq(vault.balanceOf(alice), aliceShareAmount);
        assertEq(vault.convertToAssets(vault.balanceOf(alice)), aliceUnderlyingAmount);
        assertEq(vault.convertToShares(aliceUnderlyingAmount), vault.balanceOf(alice));

        // Expect a 1:1 ratio before mutation.
        assertEq(aliceUnderlyingAmount, 2000);

        // Sanity check.
        assertEq(vault.totalSupply(), aliceShareAmount);
        assertEq(vault.totalAssets(), aliceUnderlyingAmount);

        // 2. Bob deposits 4000 tokens (mints 4000 shares)
        vm.prank(bob);
        uint256 bobShareAmount = vault.deposit(4000, bob);
        uint256 bobUnderlyingAmount = vault.previewWithdraw(bobShareAmount);
        assertEq(vault.afterDepositHookCalledCounter(), 2);

        // Expect to have received the requested underlying amount.
        assertEq(bobUnderlyingAmount, 4000);
        assertEq(vault.balanceOf(bob), bobShareAmount);
        assertEq(vault.convertToAssets(vault.balanceOf(bob)), bobUnderlyingAmount);
        assertEq(vault.convertToShares(bobUnderlyingAmount), vault.balanceOf(bob));

        // Expect a 1:1 ratio before mutation.
        assertEq(bobShareAmount, bobUnderlyingAmount);

        // Sanity check.
        uint256 preMutationShareBal = aliceShareAmount + bobShareAmount;
        uint256 preMutationBal = aliceUnderlyingAmount + bobUnderlyingAmount;
        assertEq(vault.totalSupply(), preMutationShareBal);
        assertEq(vault.totalAssets(), preMutationBal);
        assertEq(vault.totalSupply(), 6000);
        assertEq(vault.totalAssets(), 6000);

        // 3. Vault mutates by +3000 tokens...                    |
        //    (simulated yield returned from strategy)...
        // The Vault now contains more tokens than deposited which causes the exchange rate to change.
        // Alice share is 33.33% of the Vault, Bob 66.66% of the Vault.
        // Alice's share count stays the same but the underlying amount changes from 2000 to 3000.
        // Bob's share count stays the same but the underlying amount changes from 4000 to 6000.
        underlying.mint(address(vault), mutationUnderlyingAmount);
        assertEq(vault.totalSupply(), preMutationShareBal);
        assertEq(vault.totalAssets(), preMutationBal + mutationUnderlyingAmount);
        assertEq(vault.balanceOf(alice), aliceShareAmount);
        assertEq(
            vault.convertToAssets(vault.balanceOf(alice)),
            aliceUnderlyingAmount + (mutationUnderlyingAmount / 3) * 1
        );
        assertEq(vault.balanceOf(bob), bobShareAmount);
        assertEq(vault.convertToAssets(vault.balanceOf(bob)), bobUnderlyingAmount + (mutationUnderlyingAmount / 3) * 2);

        // 4. Alice deposits 2000 tokens (mints 1333 shares)
        vm.prank(alice);
        vault.deposit(2000, alice);

        assertEq(vault.totalSupply(), 7333);
        assertEq(vault.balanceOf(alice), 3333);
        assertEq(vault.convertToAssets(vault.balanceOf(alice)), 4999);
        assertEq(vault.balanceOf(bob), 4000);
        assertEq(vault.convertToAssets(vault.balanceOf(bob)), 6000);

        // 5. Bob mints 2000 shares (costs 3001 assets)
        // NOTE: Bob's assets spent got rounded up
        // NOTE: Alices's vault assets got rounded up
        vm.prank(bob);
        vault.mint(2000, bob);

        assertEq(vault.totalSupply(), 9333);
        assertEq(vault.balanceOf(alice), 3333);
        assertEq(vault.convertToAssets(vault.balanceOf(alice)), 5000);
        assertEq(vault.balanceOf(bob), 6000);
        assertEq(vault.convertToAssets(vault.balanceOf(bob)), 9000);

        // Sanity checks:
        // Alice and bob should have spent all their tokens now
        assertEq(underlying.balanceOf(alice), 0);
        assertEq(underlying.balanceOf(bob), 0);
        // Assets in vault: 4k (alice) + 7k (bob) + 3k (yield) + 1 (round up)
        assertEq(vault.totalAssets(), 14001);

        // 6. Vault mutates by +3000 tokens
        // NOTE: Vault holds 17001 tokens, but sum of assetsOf() is 17000.
        underlying.mint(address(vault), mutationUnderlyingAmount);
        assertEq(vault.totalAssets(), 17001);
        assertEq(vault.convertToAssets(vault.balanceOf(alice)), 6071);
        assertEq(vault.convertToAssets(vault.balanceOf(bob)), 10929);

        // 7. Alice redeem 1333 shares (2428 assets)
        vm.prank(alice);
        vault.redeem(1333, alice, alice);

        assertEq(underlying.balanceOf(alice), 2428);
        assertEq(vault.totalSupply(), 8000);
        assertEq(vault.totalAssets(), 14573);
        assertEq(vault.balanceOf(alice), 2000);
        assertEq(vault.convertToAssets(vault.balanceOf(alice)), 3643);
        assertEq(vault.balanceOf(bob), 6000);
        assertEq(vault.convertToAssets(vault.balanceOf(bob)), 10929);

        // 8. Bob withdraws 2929 assets (1608 shares)
        vm.prank(bob);
        vault.withdraw(2929, bob, bob);

        assertEq(underlying.balanceOf(bob), 2929);
        assertEq(vault.totalSupply(), 6392);
        assertEq(vault.totalAssets(), 11644);
        assertEq(vault.balanceOf(alice), 2000);
        assertEq(vault.convertToAssets(vault.balanceOf(alice)), 3643);
        assertEq(vault.balanceOf(bob), 4392);
        assertEq(vault.convertToAssets(vault.balanceOf(bob)), 8000);

        // 9. Alice withdraws 3643 assets (2000 shares)
        // NOTE: Bob's assets have been rounded back up
        vm.prank(alice);
        vault.withdraw(3643, alice, alice);

        assertEq(underlying.balanceOf(alice), 6071);
        assertEq(vault.totalSupply(), 4392);
        assertEq(vault.totalAssets(), 8001);
        assertEq(vault.balanceOf(alice), 0);
        assertEq(vault.convertToAssets(vault.balanceOf(alice)), 0);
        assertEq(vault.balanceOf(bob), 4392);
        assertEq(vault.convertToAssets(vault.balanceOf(bob)), 8001);

        // 10. Bob redeem 4392 shares (8001 tokens)
        vm.prank(bob);
        vault.redeem(4392, bob, bob);
        assertEq(underlying.balanceOf(bob), 10930);
        assertEq(vault.totalSupply(), 0);
        assertEq(vault.totalAssets(), 0);
        assertEq(vault.balanceOf(alice), 0);
        assertEq(vault.convertToAssets(vault.balanceOf(alice)), 0);
        assertEq(vault.balanceOf(bob), 0);
        assertEq(vault.convertToAssets(vault.balanceOf(bob)), 0);

        // Sanity check
        assertEq(underlying.balanceOf(address(vault)), 0);
    }

    function testFailDepositWithNotEnoughApproval() public {
        underlying.mint(address(this), 0.5e18);
        underlying.approve(address(vault), 0.5e18);
        assertEq(underlying.allowance(address(this), address(vault)), 0.5e18);

        vault.deposit(1 ether, address(this));
    }

    function testFailWithdrawWithNotEnoughUnderlyingAmount() public {
        underlying.mint(address(this), 0.5e18);
        underlying.approve(address(vault), 0.5e18);

        vault.deposit(0.5e18, address(this));

        vault.withdraw(1 ether, address(this), address(this));
    }

    function testFailRedeemWithNotEnoughShareAmount() public {
        underlying.mint(address(this), 0.5e18);
        underlying.approve(address(vault), 0.5e18);

        vault.deposit(0.5e18, address(this));

        vault.redeem(1 ether, address(this), address(this));
    }

    function testFailWithdrawWithNoUnderlyingAmount() public {
        vault.withdraw(1 ether, address(this), address(this));
    }

    function testFailRedeemWithNoShareAmount() public {
        vault.redeem(1 ether, address(this), address(this));
    }

    function testFailDepositWithNoApproval() public {
        vault.deposit(1 ether, address(this));
    }

    function testFailMintWithNoApproval() public {
        vault.mint(1 ether, address(this));
    }

    function testFailDepositZero() public {
        vault.deposit(0, address(this));
    }

    function testMintZero() public {
        address alice = address(0xABCD);
        vault.mint(0, alice);

        assertEq(vault.balanceOf(alice), 0);
        assertEq(vault.convertToAssets(vault.balanceOf(alice)), 0);
        assertEq(vault.totalSupply(), 0);
        assertEq(vault.totalAssets(), 0);
    }

    function testFailRedeemZero() public {
        address alice = address(0xABCD);
        vault.redeem(0, alice, alice);
    }

    function testWithdrawZero() public {
        address alice = address(0xABCD);
        vault.withdraw(0, alice, alice);

        assertEq(vault.balanceOf(alice), 0);
        assertEq(vault.convertToAssets(vault.balanceOf(alice)), 0);
        assertEq(vault.totalSupply(), 0);
        assertEq(vault.totalAssets(), 0);
    }

    function testVaultInteractionsForSomeoneElse() public {
        // init 2 users with a 1 ether balance
        address alice = address(0xABCD);
        address bob = address(0xDCBA);
        underlying.mint(alice, 1 ether);
        underlying.mint(bob, 1 ether);

        vm.prank(alice);
        underlying.approve(address(vault), 1 ether);

        vm.prank(bob);
        underlying.approve(address(vault), 1 ether);

        // alice deposits 1 ether for bob
        vm.prank(alice);
        vault.deposit(1 ether, bob);

        assertEq(vault.balanceOf(alice), 0);
        assertEq(vault.balanceOf(bob), 1 ether);
        assertEq(underlying.balanceOf(alice), 0);

        // bob mint 1 ether for alice
        vm.prank(bob);
        vault.mint(1 ether, alice);
        assertEq(vault.balanceOf(alice), 1 ether);
        assertEq(vault.balanceOf(bob), 1 ether);
        assertEq(underlying.balanceOf(bob), 0);

        // alice redeem 1 ether for bob
        vm.prank(alice);
        vault.redeem(1 ether, bob, alice);

        assertEq(vault.balanceOf(alice), 0);
        assertEq(vault.balanceOf(bob), 1 ether);
        assertEq(underlying.balanceOf(bob), 1 ether);

        // bob withdraw 1 ether for alice
        vm.prank(bob);
        vault.withdraw(1 ether, alice, bob);

        assertEq(vault.balanceOf(alice), 0);
        assertEq(vault.balanceOf(bob), 0);
        assertEq(underlying.balanceOf(alice), 1 ether);
    }
}