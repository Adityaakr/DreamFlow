// Somnia mainnet (chain id 5031) DEX deployment.
// Source: somnia-dex-protocol/config/mainnet/deploy.json
//
// There are two independent SpotPool deployment sets — one paired with the
// stop-order registries and one paired with the on-chain market makers. Both
// are live on mainnet and emit the same SpotPool events, so we subscribe to
// every pool address and tag each event with its market label.

export const SOMNIA_CHAIN_ID = 5031;

export type Address = `0x${string}`;

export type TokenInfo = {
  symbol: string;
  name: string;
  decimals: number;
  address: Address | "native";
};

export const TOKENS: Record<string, TokenInfo> = {
  SOMI: {
    symbol: "SOMI",
    name: "Somnia (native)",
    decimals: 18,
    address: "native",
  },
  USDso: {
    symbol: "USDso",
    name: "USD Somnia",
    decimals: 18,
    address: "0x00000022dA000002656c64D9eA6011ea952D008A",
  },
  "USDC.e": {
    symbol: "USDC.e",
    name: "Bridged USDC (Stargate)",
    decimals: 6,
    address: "0x28BeC7e30E6FaEE657A03e19Bf1128AaD7632A00",
  },
  WBTC: {
    symbol: "WBTC",
    name: "Wrapped BTC",
    decimals: 8,
    address: "0xC5098b3cA516784323872F17235fa074E167D3D2",
  },
  WETH: {
    symbol: "WETH",
    name: "WETH",
    decimals: 18,
    address: "0x936Ab8C674bcb567CD5dEB85D8A216494704E9D8",
  },
};

export type SpotPool = {
  address: Address;
  base: keyof typeof TOKENS;
  quote: keyof typeof TOKENS;
  label: string;
  /** "primary" = stop-order registry-linked pool; "mm" = market-maker-bound pool. */
  group: "primary" | "mm";
  tickSize: bigint;
  lotSize: bigint;
  minQuantity: bigint;
};

export const SPOT_POOLS: SpotPool[] = [
  {
    address: "0x47E6F73F02750B0C6D52cEAb4d4Dd23B50b475A7",
    base: "SOMI",
    quote: "USDso",
    label: "SOMI/USDso",
    group: "primary",
    tickSize: 10000000000000000n,
    lotSize: 1000000000000000n,
    minQuantity: 1000000000000000n,
  },
  {
    address: "0x9762d405093F773F3aEAaD7a0abB817612302F62",
    base: "USDC.e",
    quote: "USDso",
    label: "USDC.e/USDso",
    group: "primary",
    tickSize: 100000000000000n,
    lotSize: 10000n,
    minQuantity: 10000n,
  },
  {
    address: "0x92326852eCfdeb90602C9cfBaCF60977847E5840",
    base: "WBTC",
    quote: "USDso",
    label: "WBTC/USDso",
    group: "primary",
    tickSize: 10000000000000000n,
    lotSize: 10000n,
    minQuantity: 10000n,
  },
  {
    address: "0x2c62a192A3b276Bd6537ce922B17f5cE8A9F9E1A",
    base: "WETH",
    quote: "USDso",
    label: "WETH/USDso",
    group: "primary",
    tickSize: 10000000000000000n,
    lotSize: 1000000000000000n,
    minQuantity: 1000000000000000n,
  },
  {
    address: "0x035De7403eac6872787779CCA7CCF1b4CDb61379",
    base: "SOMI",
    quote: "USDso",
    label: "SOMI/USDso (MM)",
    group: "mm",
    tickSize: 10000000000000000n,
    lotSize: 1000000000000000n,
    minQuantity: 1000000000000000n,
  },
  {
    address: "0x47fD2f18426f67106DBaC82F6d21D446c5F2120b",
    base: "USDC.e",
    quote: "USDso",
    label: "USDC.e/USDso (MM)",
    group: "mm",
    tickSize: 100000000000000n,
    lotSize: 10000n,
    minQuantity: 10000n,
  },
  {
    address: "0x25bfF6B7B5E2243424F38E75de7ab03C0522a5EA",
    base: "WBTC",
    quote: "USDso",
    label: "WBTC/USDso (MM)",
    group: "mm",
    tickSize: 10000000000000000n,
    lotSize: 10000n,
    minQuantity: 10000n,
  },
  {
    address: "0xa936da11B57b50A344e1293AAaE5232885ea2bDE",
    base: "WETH",
    quote: "USDso",
    label: "WETH/USDso (MM)",
    group: "mm",
    tickSize: 10000000000000000n,
    lotSize: 1000000000000000n,
    minQuantity: 1000000000000000n,
  },
];

export const POOLS_BY_ADDRESS: Map<string, SpotPool> = new Map(
  SPOT_POOLS.map((p) => [p.address.toLowerCase(), p]),
);
