
import {Button, Container, Grid, Paper} from "@mui/material";
import axios from "axios";
import React from "react";
//import { convertToSmallCoin } from "../../services/blockchain/assetsConverter";
import {convertToSmallCoin} from "omnistar_blockchain_js/src/services/blockchain/assetsConverter"
import { DEX } from "../dapp/marketplace/dex";
import { CreateDepositJson } from "../dapp/marketplace/objects/DepositUtil";
import { CreateTransactionJson } from "../dapp/marketplace/objects/TransactionUtil";
import { LoadingDialog, SimpleOmnistarMessage, useSendMsg, useWCCreateClient } from "./hooks";
import { SignClient } from "@walletconnect/sign-client/dist/types/client";
export default function WalletConnect() {
    const { account, client, session, handleConnect, handleDisconnect } = useWCCreateClient();

    let state = {
        token_id: '',
        contractAddress: '',
        transactionType: 'ERC721',
        price: '0',
        asset: 'ETH'};
    async function handle_token_id_Change(event) {
        state.token_id = event.target.value;
    }
    async function handle_contractAddress_Change(event) {
        state.contractAddress = event.target.value;
    }
    async function handle_transactionType_Change(event) {
        state.transactionType = event.target.value;
    }
    async function handle_price_Change(event) {
        state.price = event.target.value;
        alert (state.price)
    }
    async function handle_asset_Change(event) {
        state.asset = event.target.value;
    }
    async function handleSubmit(event) {
        alert(JSON.stringify(state));
        event.preventDefault();
    }

    console.log(`state.price=${state.price}, ${convertToSmallCoin(state.asset,Number(state.price))} ${state.asset}`)

    const depositJson = async (): Promise<SimpleOmnistarMessage> => {
        let res = await CreateDepositJson(
            [
                {"key":"token_id","value": "4"},
                {"key": "contractAddress", "value": "0xa0e5317b76e4a5bb17331f9e900582c2a0c54e09"},
                {"key": "transactionType", "value": "ERC721"}],
            10,
            {object_id:"trans_1", safe_id:"safe_1"}
        );
        console.log({ depositJson: res });
        return { data: JSON.stringify(res), destination: DEX.omni_address };
    }

    const transactionJson = async (): Promise<SimpleOmnistarMessage> => {
        const address = account.split(":")[1];
        const res = await CreateTransactionJson(
            DEX.eth_address,
            convertToSmallCoin(state.asset,Number(state.price)),
            state.asset,
          1
        );
        console.log({ transactionJson: res });
        return { data: JSON.stringify(res), destination: address };
    }

    const tx: (() => Promise<SimpleOmnistarMessage>)[] = [
        transactionJson,
        depositJson
    ];

    const { handleOmniSend } = useSendMsg({ account, client: client as SignClient, session, messagesCreator: tx });
    const { handleETHSend } = useSendMsg({ account, client: client as SignClient, session, messagesCreator: tx });

    async function doBroadcast(omnistar, sig, address):Promise<any>{
        const {transactionHash, code, rawLog} = (await omnistar.client?.broadcastTx(sig))!;
        let url = `http://localhost:8080/api/broadcast/tx`;
        console.log(JSON.stringify(omnistar.client));
        console.log(JSON.stringify(omnistar));
        const {data, status} = await axios.post(url, {
            SIG: Buffer.from(sig).toString("base64"),
            SIG_ARR: sig,
            ADDRESS: address
        });
        console.log(JSON.stringify(status));
        if (status !== 200) return undefined;
        console.log(JSON.stringify(data));
        //return data;
        //return {data.transactionHash, data.code, data.rawLog};
    }


    return (
        <Container maxWidth="xs">
            <Grid mt={12}>
                <Paper variant='outlined'>
                    {account
                        && (
                            <>
                                <b>{account}</b>
                                <br></br><br></br>
                                <form onSubmit={handleSubmit}>
                                    <label>
                                        Token ID:
                                        <input type="text"  onChange={handle_token_id_Change} />
                                    </label>
                                    <br></br>
                                    <label>
                                        Contract Address:
                                        <input type="text"  onChange={handle_contractAddress_Change} />
                                    </label>
                                    <br></br>
                                    <label>
                                        Transaction Type:
                                        <input type="text"  value={state.transactionType} onChange={handle_transactionType_Change} />
                                    </label>

                                    <br></br><br></br>
                                    <label>
                                        Price:
                                        <input type="text"   onChange={handle_price_Change} />
                                    </label>
                                    <br></br>
                                    <label>
                                        Asset:
                                        <input type="text"  value={state.asset} onChange={handle_asset_Change} />
                                    </label>
                                    <input type="submit" value="Submit" />
                                </form>
                                <Button onClick={handleOmniSend}>Send Transaction</Button>
                                <Button onClick={handleETHSend}>Send ETH Transaction</Button>
                            </>
                        )
                    }
                    {
                        account
                        ? <Button onClick={ handleDisconnect } disabled={!client}>Disconnect</Button>
                        : <Button onClick={ handleConnect } disabled={!client}>Connect</Button>
                    }
                </Paper>
            </Grid>
            <LoadingDialog/>
        </Container>
    );
}
class NameForm extends React.Component {
    constructor(props) {
        super(props);
        this.state = {value: ''};

        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    handleChange(event) {
        this.setState({value: event.target.value});
    }

    handleSubmit(event) {
        alert('A name was submitted: ' + this.state["value"]);
        event.preventDefault();
    }

    render() {
        return (
            <form onSubmit={this.handleSubmit}>
                <label>
                    Name:
                    <input type="text" value={this.state["value"]} onChange={this.handleChange} />
                </label>
                <input type="submit" value="Submit" />
            </form>
        );
    }
}