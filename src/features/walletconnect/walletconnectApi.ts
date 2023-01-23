import { SignClient as signClient } from "@walletconnect/sign-client";
import { SignClient } from "@walletconnect/sign-client/dist/types/client";

const subscribeToEvents = async (client: SignClient) => {
    if (!client)
        throw Error("Unable to subscribe to events. Client does not exist.");
    try {
        client.on("session_delete", () => {
            console.log("The user has disconnected the session from their wallet.");
            // reset();
        });
    } catch (e) {
        console.log(e);
    }
}

export const createClient = async () => {
    try {            
        const client: SignClient = await signClient.init({ projectId: process.env.REACT_APP_PROJECT_ID ?? "665c6d45182a6aefe9087f1ef8cd35a2" })
        await subscribeToEvents(client);
    } catch (e) {
        console.error(e);
    }
}
