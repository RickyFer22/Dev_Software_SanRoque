exports.handler = async (event) => {

    try {

        const response = await fetch(
            "https://muni-bot-production.up.railway.app/chat",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: event.body
            }
        );


        const data = await response.text();


        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json"
            },
            body: data
        };


    } catch(error) {

        return {
            statusCode: 500,
            body: JSON.stringify({
                error:"Error conectando con el bot"
            })
        };

    }

};
