import { action, makeObservable, observable } from "mobx";
import { computedFn } from "mobx-utils";
import { hexToNumberString } from "web3-utils";
import { CoinPretty, Int } from "@keplr-wallet/unit";
import { HasMapStore } from "@keplr-wallet/stores";
import type { Currency } from "@keplr-wallet/types";
import { QueryFn, Erc20Abi } from "./types";

/** Queries any erc20 contract address for a particular user hexAddress. */
class ObservableErc20Query {
  /** `erc20Address => balance` */
  balances: Map<string, Int> = observable.map();

  constructor(
    protected readonly hexAddress: string,
    protected readonly queryFn: QueryFn,
    protected readonly currency: Currency
  ) {
    makeObservable(this);
  }

  getBalance = computedFn((erc20Address: string): CoinPretty => {
    if (!this.balances.has(erc20Address)) {
      this.fetchBalance(erc20Address);
      return new CoinPretty(this.currency, new Int(0)).ready(false);
    }

    const balanceRaw = this.balances.get(erc20Address);
    return balanceRaw
      ? new CoinPretty(this.currency, balanceRaw)
      : new CoinPretty(this.currency, new Int(0)).ready(false);
  });

  @action
  protected async fetchBalance(erc20Address: string) {
    const res = (await this.queryFn({
      method: "eth_call",
      params: [
        {
          to: erc20Address,
          data: Erc20Abi.encodeFunctionData("balanceOf", [this.hexAddress]),
        },
        "latest",
      ],
    })) as string;
    this.balances.set(erc20Address, new Int(hexToNumberString(res)));
  }
}

/** Queries erc20s for user hexAddresses. */
export class ObservableErc20Queries extends HasMapStore<ObservableErc20Query> {
  constructor(
    readonly queryFn: QueryFn,
    protected readonly currency: Currency
  ) {
    super(
      (hexAddress: string) =>
        new ObservableErc20Query(hexAddress, queryFn, currency)
    );
  }

  getQueryEthHexAddress(hexAddress: string): ObservableErc20Query {
    return this.get(hexAddress);
  }
}
