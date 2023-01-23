import Button from "@mui/material/Button/Button";
import { SignClient as signClient } from "@walletconnect/sign-client";
import { SignClient } from "@walletconnect/sign-client/dist/types/client";
import { Web3Modal } from "@web3modal/standalone";
import Omnistar from "omnistar_blockchain_js/src/services/blockchain/cosmos/omnistar/index";
import { useMemo, useCallback, useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { setLoadingMsg, selectAddress, selectClient, selectSession, selectStatus, reset, setStatus, setClient, setSession, setAddress, setPubkey, setFromCach, selectPubkey, selectLoadingMsg } from "./walletconnectSlice";
import { SessionTypes } from "@walletconnect/types/dist/types/sign-client/session";
import { Algo } from "@cosmjs/proto-signing";
import { parseAccountDataValues, stringifySignDocValues } from "cosmos-wallet";
import { CircularProgress, Dialog, DialogContent, DialogContentText, Grid } from "@mui/material";
import React from "react";
import { SignDoc } from "cosmjs-types/cosmos/tx/v1beta1/tx";

type BasicDialogProps = {
    open: boolean,
    contentText: string,
    loader: boolean
}

export function BasicDialog({ open, contentText, loader }: BasicDialogProps){
    return (
        <React.Fragment>
            <Dialog open={open} aria-labelledby="responsive-dialog-title">
                <DialogContent>
                    <DialogContentText>{ contentText }</DialogContentText>
                    { loader && (
                    <Grid container spacing={2}>
                        <Grid item xs={12} mt={2} textAlign={"center"}>
                            <CircularProgress color="inherit" />
                        </Grid>
                    </Grid>)}
                </DialogContent>
            </Dialog>
        </React.Fragment>
    );
}

export function LoadingDialog() {
    const status = useAppSelector(selectStatus);
    const contentText = useAppSelector(selectLoadingMsg);
    const [open, setOpen] = useState(status === 'loading');
    useEffect(()=>setOpen(status === 'loading'), [status]);
    return (<BasicDialog open={open} contentText={contentText} loader={true} />);
}

export function useWCCreateClient() {
    const dispatch = useAppDispatch();
    const account = useAppSelector(selectAddress);
    const session = useAppSelector(selectSession);
    const client = useAppSelector(selectClient);
    const status = useAppSelector(selectStatus);

    const web3Modal = useMemo(() => new Web3Modal({
        projectId: process.env.REACT_APP_PROJECT_ID,
        standaloneChains: ["eip155:5"]
    }), []);

    const subscribeToEvents = useCallback(async (client: SignClient) => {
        if (!client)
            throw Error("Unable to subscribe to events. Client does not exist.");
        try {
            client.on("session_delete", () => {
                console.log("The user has disconnected the session from their wallet.");
                dispatch(reset);
            });
        } catch (e) {
            console.log(e);
        }
    }, [dispatch]);

    const createClient = useCallback(async () => {
        try {
            const client: SignClient = await signClient.init({ projectId: process.env.REACT_APP_PROJECT_ID ?? "665c6d45182a6aefe9087f1ef8cd35a2" })
            dispatch(setClient(client));
            await subscribeToEvents(client);
        } catch (e) {
            console.error(e);
        }
    }, [dispatch, subscribeToEvents]);

    useEffect(() => {
        if (!client) createClient();
    }, [client, createClient]);

    useEffect(() => {
        if (!session && !account && status === 'initial') dispatch(setFromCach())
    }, [dispatch, session, account, status]);

    async function handleConnect() {
        if (!client) throw Error("missing client");

        const proposalNamespace = {
            eip155: {
                methods: ["eth_sendTransaction","personal_sign"],
                chains: ["eip155:5"],
                events: ["connect", "disconnect"],
            },cosmos: {
                methods: ["cosmos_signDirect", "cosmos_getAccounts"],
                chains: ["cosmos:omnistar"],
                events: ["connect", "disconnect"]
            }
        }

        const { uri, approval } = await client.connect({
            requiredNamespaces: proposalNamespace
        });

        if (uri) {
            web3Modal.openModal({ uri });
        }

        try {
            const sessionNamespace: SessionTypes.Struct = await approval();
            onSessionConnected(sessionNamespace);
            web3Modal.closeModal();
        } catch (e) {
            console.log(e);
        }
    }

    const getPubkeyFromClient = async (chainId: string, session: SessionTypes.Struct): Promise<Uint8Array> => {
        const [ac]: {
            pubkey: string;
            address: string;
            algo: Algo;
        }[] = await client!.request({
            topic: session!.topic,
            chainId,
            request: { method: "cosmos_getAccounts", params: {} },
        });
        const { pubkey } = parseAccountDataValues(ac);
        return pubkey;
    }

    const getPubkeyFromBlockchain = async (address: string): Promise<Uint8Array | undefined> => {
        const omnistar = new Omnistar(address, false);
        const pubkey = await omnistar.getPubKey(address);
        if (pubkey.length === 0) return undefined;
        return pubkey;
    }

    const getPubKey = async (address: string, session: SessionTypes.Struct): Promise<Uint8Array> => {
        dispatch(setStatus('loading'));
        const chainId = "cosmos:omnistar";
        let pubkey = await getPubkeyFromBlockchain(address);
        if (!pubkey) pubkey = await getPubkeyFromClient(chainId, session);
        dispatch(setStatus('initial'));
        return pubkey;
    }

    async function onSessionConnected(session: SessionTypes.Struct) {
        try {
            dispatch(setSession(session));
            const account = session.namespaces.cosmos.accounts[0].slice(9);
            dispatch(setAddress(account));

            const address = account.split(":")[1];
            if (!address) throw new Error('missing account');

            const pubkey = await getPubKey(address, session);
            dispatch(setPubkey(pubkey));
        } catch (e) {
            console.log(e);
        }
    }

    async function handleDisconnect() {
        dispatch(setStatus('loading'));
        try {
            if (!client) throw Error("missing client");
            await client!.disconnect({
                topic: session!.topic,
                reason: {
                    code: 6000,
                    message: "User disconnected",
                },
            });
        } catch (e) {
            console.log(e);
        }
        dispatch(setStatus('initial'));
        dispatch(reset());
    }

    return {
        ConnectButton: () => (
            account
                ? <Button onClick={handleDisconnect} disabled={!client}>disconnect</Button>
                : <Button onClick={handleConnect} disabled={!client}>Connect</Button>
        ),
        handleDisconnect,
        handleConnect,
        web3Modal,
        client,
        session,
        account
    }
}

interface CosmosRpcResponse {
    pub_key: {
        type: string;
        value: string;
    };
    signature: string;
}

export interface PropSendMsg {
    client?: SignClient,
    account?: string,
    session?: SessionTypes.Struct,
    messages?: SimpleOmnistarMessage[],
    messagesCreator?: (() => Promise<SimpleOmnistarMessage>)[]
}

export type SimpleOmnistarMessage = { destination: string; data: string; };

export function useSendMsg({ client, account, session, messages = [], messagesCreator }: PropSendMsg) {
    const dispatch = useAppDispatch();
    const [txnUrl, setTxnUrl] = useState();
    const pubkey = useAppSelector(selectPubkey);
    async function handleOmniSend() {
        dispatch(setStatus('loading'));
        if (!pubkey) throw new Error('missing pubkey');
        if (!account) throw new Error('missing account');
        let sig: Uint8Array = Uint8Array.from([]);
        try {
            const address = account.split(":")[1];
            const chainId = "cosmos:omnistar";
            const omnistar = new Omnistar(address, false);

            /// START: ONLY FOR DEV
            const balances = await omnistar.client?.getAllBalances(address);
            if(!balances || balances?.length === 0) {
                dispatch(setLoadingMsg("No balance in the account, fetching faucet..."));
                if (!await Omnistar.getAirdrop(address))
                    throw new Error('Need faucet...');
            }
            /// END: ONLY FOR DEV
            dispatch(setLoadingMsg("Creating messages"));
            let signDoc: SignDoc;
            if(messages.length === 0){
                const { signDoc: sd } = await omnistar.createMessages({
                    to: address,
                    pubkey,
                    messages: await Promise.all(messagesCreator.map(async (msg) => {
                        return { ...(await msg()), ...{ creator: address } };
                    }))
                });
                signDoc = sd;
            }
            else {
                const { signDoc: sd } = await omnistar.createMessages({
                    to: messages[0].destination ?? address,
                    pubkey,
                    messages: messages.map((msg) => {
                        return { ...msg, ...{ creator: address } }
                    })
                });
                signDoc = sd;
            }

            const params = {
                signerAddress: address,
                signDoc: stringifySignDocValues(signDoc),
            };
            dispatch(setLoadingMsg("Waiting for signature"));
            const {
                // pub_key, 
                signature
            } = await client!.request<CosmosRpcResponse>({
                request: { method: "cosmos_signDirect", params },
                topic: session!.topic,
                chainId
            });
            
            const isVerified = await omnistar.verifyDirectSignature(address, signature, signDoc);

            if (!isVerified){
                const msg = 'Signature is unverified';
                dispatch(setLoadingMsg(msg));
                throw new Error(msg);
            }

            sig = omnistar.formatSignature(signDoc, [Uint8Array.from(Buffer.from(signature, "base64"))]);
            const { transactionHash, code, rawLog } = (await omnistar.client?.broadcastTx(sig))!;
            console.log({ transactionHash, code, rawLog });
            dispatch(setLoadingMsg('Signature broadcasting complete'));
        }
        catch (e: any) {
            console.log(Buffer.from(sig).toString("base64"));
            console.error(e);
        }
        dispatch(setStatus('initial'));
    }
    async function handleETHSend() {
        dispatch(setStatus('loading'));
        if (!pubkey) throw new Error('missing pubkey');
        if (!account) throw new Error('missing account');
        let sig: Uint8Array = Uint8Array.from([]);
        try {
            const tx = {
                from: session.namespaces.eip155.accounts[0].slice(9),
                to: "0xBDE1EAE59cE082505bB73fedBa56252b1b9C60Ce",
                data: "0x",
                gasPrice: "0x029104e28c",
                gasLimit: "0x5208",
                value: "0x00",
            };

            const result:any = await client.request({
                topic: session.topic,
                chainId: "eip155:5",
                request: {
                    method: "eth_sendTransaction",
                    params: [tx],
                },
            });
            setTxnUrl(result);
            dispatch(setLoadingMsg(`Transaction Done! Tx:${result}`));

        } catch (e) {
            console.log(e);
        }
        dispatch(setStatus('initial'));
    }
    return { handleOmniSend, handleETHSend};
}