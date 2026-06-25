#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, token, Address, Env, String, Symbol,
};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Owner,
    Name,
    Balance,
    OrderCount,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PaymentEvent {
    pub amount: i128,
    pub order_id: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct InitializedEvent {
    pub name: String,
}

const INIT_EVENT: Symbol = symbol_short!("init");
const PAY_EVENT: Symbol = symbol_short!("pay");

#[contract]
pub struct RestaurantContract;

#[contractimpl]
impl RestaurantContract {
    /// Initialize the restaurant with an owner and display name.
    pub fn init(env: Env, owner: Address, name: String) {
        if env.storage().instance().has(&DataKey::Owner) {
            panic!("already initialized");
        }
        owner.require_auth();
        env.storage().instance().set(&DataKey::Owner, &owner);
        env.storage().instance().set(&DataKey::Name, &name);
        env.storage().instance().set(&DataKey::Balance, &0i128);
        env.storage().instance().set(&DataKey::OrderCount, &0u64);

        env.events()
            .publish((INIT_EVENT, owner.clone()), InitializedEvent { name });
    }

    /// Process a payment from customer to restaurant via token transfer (inter-contract).
    pub fn pay(env: Env, customer: Address, token_address: Address, amount: i128, order_id: u64) {
        customer.require_auth();

        if amount <= 0 {
            panic!("amount must be positive");
        }

        let owner: Address = env
            .storage()
            .instance()
            .get(&DataKey::Owner)
            .expect("not initialized");

        let token_client = token::Client::new(&env, &token_address);
        token_client.transfer(&customer, &owner, &amount);

        let balance: i128 = env.storage().instance().get(&DataKey::Balance).unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::Balance, &(balance + amount));

        let count: u64 = env.storage().instance().get(&DataKey::OrderCount).unwrap_or(0);
        env.storage().instance().set(&DataKey::OrderCount, &(count + 1));

        env.events().publish(
            (PAY_EVENT, customer.clone()),
            PaymentEvent { amount, order_id },
        );
    }

    pub fn get_balance(env: Env) -> i128 {
        env.storage().instance().get(&DataKey::Balance).unwrap_or(0)
    }

    pub fn get_owner(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Owner)
            .expect("not initialized")
    }

    pub fn get_name(env: Env) -> String {
        env.storage()
            .instance()
            .get(&DataKey::Name)
            .expect("not initialized")
    }

    pub fn get_order_count(env: Env) -> u64 {
        env.storage().instance().get(&DataKey::OrderCount).unwrap_or(0)
    }
}

mod test;
