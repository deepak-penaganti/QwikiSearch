// http://en.wikipedia.org/?curid=18630637
export type AdvancedQueryResponse = {
    "batchcomplete": string,
    "continue": {
        "sroffset": number,
        "continue": string
    },
    "query": {
        "searchinfo": {
            "totalhits": number,
            "suggestion": string,
            "suggestionsnippet": string
        },
        "search": {
            "ns": number,
            "title": string,
            "pageid": number,
            "size": number,
            "wordcount": number,
            "snippet": string,
            "timestamp": string
        }[]
    }
}

export default AdvancedQueryResponse;