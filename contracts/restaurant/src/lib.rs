#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env, String,
    token,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    InsufficientFunds = 3,
    AmountMustBePositive = 4,
}

#[contracttype]
#[derive(Clone)]
enum DataKey {
    Owner,
    Name,
    Balance,
    OrderCount,
    Initialized,
}

#[contract]
pub struct RestaurantContract;

#[contractimpl]
impl RestaurantContract {
    pub fn init(env: Env, owner: Address, name: String) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Initialized) {
            return Err(Error::AlreadyInitialized);
        }

        env.storage().instance().set(&DataKey::Owner, &owner);
        env.storage().instance().set(&DataKey::Name, &name);
        env.storage().instance().set(&DataKey::Balance, &0i128);
        env.storage().instance().set(&DataKey::OrderCount, &0u64);
        env.storage().instance().set(&DataKey::Initialized, &true);

        env.events().publish(
            (symbol_short!("init"),),
            (owner, name),
        );

        Ok(())
    }

    pub fn pay(
        env: Env,
        customer: Address,
        token: Address,
        amount: i128,
        order_id: u64,
    ) -> Result<(), Error> {
        if !env.storage().instance().has(&DataKey::Initialized) {
            return Err(Error::NotInitialized);
        }

        if amount <= 0 {
            return Err(Error::AmountMustBePositive);
        }

        customer.require_auth();

        let owner: Address = env.storage().instance().get(&DataKey::Owner).unwrap();
        let token_client = token::Client::new(&env, &token);

        token_client.transfer(&customer, &owner, &amount);

        // Update balance
        let mut balance: i128 = env.storage().instance().get(&DataKey::Balance).unwrap();
        balance += amount;
        env.storage().instance().set(&DataKey::Balance, &balance);

        // Update order count
        let mut count: u64 = env.storage().instance().get(&DataKey::OrderCount).unwrap();
        count += 1;
        env.storage().instance().set(&DataKey::OrderCount, &count);

        env.events().publish(
            (symbol_short!("pay"), customer),
            (amount, order_id),
        );

        Ok(())
    }

    pub fn get_owner(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Owner).unwrap()
    }

    pub fn get_name(env: Env) -> String {
        env.storage().instance().get(&DataKey::Name).unwrap()
    }

    pub fn get_balance(env: Env) -> i128 {
        env.storage().instance().get(&DataKey::Balance).unwrap_or(0)
    }

    pub fn get_order_count(env: Env) -> u64 {
        env.storage().instance().get(&DataKey::OrderCount).unwrap_or(0)
    }
}

mod test;
