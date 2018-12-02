class Edifact {

    public static getEDIDocument(ediFile) {
        // ST represents Transaction Set Header
        const PAD = ediFile.indexOf("852");
        const PO = ediFile.indexOf("ORDERS");
        if (PAD !== -1) {
            return true;
        } else if (PO !== -1) {
            return true;
        } else { return true; }
    }

    public static getPONumber(ediFile) {
        const cursor = ediFile.indexOf("ORDER+");
        const po = ediFile.slice(cursor + 6, cursor + 18);
        const poNumber = po.replace("+", "");
        return poNumber;
    }
}

export default Edifact;
