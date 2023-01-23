//import {randomUUID} from "crypto";
//import crypto from "crypto";
export async function CreateTransactionJson(
    address:string,
    amount:number,
    asset:string,
    fee:number
): Promise<any> {
    let uuid = crypto.randomUUID();
    let result = {
        "id": uuid,
        "class": "transaction",
        "parentGroup": "Primary",
        "address": address,
        "amount": amount,
        "asset": asset,
        "unit": "",
        "fee_rate": fee,
        "is_main": "false",
        "link": {
            "id": `${uuid}-link`,
            "safe_id": "mysafe",
            "link_parameter": "transfer"
        }
    }
    return result;
}