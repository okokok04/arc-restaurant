import { WalletProvider } from './context/WalletContext.jsx';
import WalletConnect from './components/WalletConnect.jsx';
import RestaurantPanel from './components/RestaurantPanel.jsx';
import EventStream from './components/EventStream.jsx';

export default function App() {
  return (
    <WalletProvider>
      <div className="app">
        <WalletConnect />
        <main className="main-content">
          <RestaurantPanel />
          <EventStream />
        </main>
        <footer className="footer">
          <p>
            Arc Restaurant dApp · Stellar Testnet · Built with Soroban + React
          </p>
        </footer>
      </div>
    </WalletProvider>
  );
}
