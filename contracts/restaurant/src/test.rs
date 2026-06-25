#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::Address as _,
    token::{StellarAssetClient, TokenClient},
    Address, Env, String,
};

fn setup_token(env: &Env, admin: &Address) -> Address {
    let token_contract = env.register_stellar_asset_contract(admin.clone());
    token_contract
}

fn mint(env: &Env, token: &Address, to: &Address, amount: i128) {
    let stellar = StellarAssetClient::new(env, token);
    stellar.mint(to, &amount);
}

#[test]
fn test_init_sets_owner_and_name() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, RestaurantContract);
    let client = RestaurantContractClient::new(&env, &contract_id);

    let owner = Address::generate(&env);
    let name = String::from_str(&env, "Arc Bistro");

    client.init(&owner, &name);

    assert_eq!(client.get_owner(), owner);
    assert_eq!(client.get_name(), name);
    assert_eq!(client.get_balance(), 0);
    assert_eq!(client.get_order_count(), 0);
}

#[test]
fn test_pay_transfers_tokens_and_updates_balance() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, RestaurantContract);
    let client = RestaurantContractClient::new(&env, &contract_id);

    let owner = Address::generate(&env);
    let customer = Address::generate(&env);
    let name = String::from_str(&env, "Arc Bistro");

    client.init(&owner, &name);

    let token = setup_token(&env, &owner);
    mint(&env, &token, &customer, 10_000_000);

    let token_client = TokenClient::new(&env, &token);
    let pay_amount: i128 = 2_500_000;

    client.pay(&customer, &token, &pay_amount, &1u64);

    assert_eq!(client.get_balance(), pay_amount);
    assert_eq!(client.get_order_count(), 1);
    assert_eq!(token_client.balance(&owner), pay_amount);
    assert_eq!(token_client.balance(&customer), 10_000_000 - pay_amount);
}

#[test]
#[should_panic(expected = "Error(Contract, #1)")]
fn test_init_twice_panics() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, RestaurantContract);
    let client = RestaurantContractClient::new(&env, &contract_id);

    let owner = Address::generate(&env);
    let name = String::from_str(&env, "Arc Bistro");

    client.init(&owner, &name);
    client.init(&owner, &name);
}

#[test]
#[should_panic(expected = "Error(Contract, #4)")]
fn test_pay_zero_amount_panics() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, RestaurantContract);
    let client = RestaurantContractClient::new(&env, &contract_id);

    let owner = Address::generate(&env);
    let customer = Address::generate(&env);
    let name = String::from_str(&env, "Arc Bistro");

    client.init(&owner, &name);

    let token = setup_token(&env, &owner);
    client.pay(&customer, &token, &0i128, &1u64);
}
