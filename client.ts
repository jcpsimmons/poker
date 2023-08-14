import { html } from 'https://deno.land/x/html@v1.2.0/mod.ts';

const clientPage = (websocketPort:number) => {
    return html`
    <!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Simsies Planning Poker</title>

    <style>
        body {
            font-family: Arial, Helvetica, sans-serif;
        }

        header {
            background-color: #333;
            color: #fff;
            padding: 1rem;
            text-align: center;
        }


        main {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }


        h2,
        p {
            text-align: center;
        }

        #Participants {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }

        #Participants ul {
            list-style-type: none;
            padding: 0;
            display: flex;
            flex-wrap: wrap;
            color: white;
            font-family: monospace;
            font-weight: bold;
            border-radius: 5px;
            padding: .1rem;
        }

        #Participants li {
            background-color: #1a1a1a;
            padding: 0.2rem;
            margin: 0.2rem;
        }

        #Result {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }

        #EstimationButtons {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;

        }

        button {
            margin: 0.25rem;
            font-size: 1.5rem;
        }

        input {
            font-size: 1.5rem;
        }

        #History div {
            background-color: #1a1a1a;
            color: white;
            border-radius: 5px;
            padding: 1rem;
            margin: auto;
            width: 100%;
            max-width: 500px;
            overflow: auto;
            height: 200px;
            font-family: monospace;
        }

        #History ul {
            list-style-type: none;
            padding: 0;
        }

        #Issue form {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }

        #Issue form div {
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: center;
        }

        .authed {
            display: none;
            width: 100%;
        }
    </style>
</head>

<body>
    <header>
        <h1>Planning Poker</h1>
    </header>
    <main>
        <section id="Join">
            <h2>Join</h2>
            <form>
                <input type="text" id="Name" name="Name" placeholder="Name">
                <button type="submit">Join</button>
            </form>
        </section>

        <div class="authed">
            <section id="Participants">
                <h2>Participants</h2>
                <ul>

                </ul>
            </section>
            <section id="Issue">
                <h2>Issue</h2>
                <p id="IssueDescription"></p>
                <form>
                    <input type="text" id="Issue" name="Issue" placeholder="Issue">
                    <div> <button>Clear Issue</button>
                        <button type="submit">Change Issue</button>
                    </div>
                </form>
            </section>
            <section id="Estimation">
                <h2>Estimation</h2>
                <div id="EstimationButtons">
                    <button>1</button>
                    <button>3</button>
                    <button>5</button>
                    <button>8</button>
                    <button>13</button>
                </div>
            </section>
            <section id="Result">
                <h2>Result</h2>
                <div id="ResultAverage">
                    <h3>Average Vote</h3>
                    <p></p>
                </div>
                <div id="ResultNumVoted">
                    <h3>Voted</h3>
                    <p></p>
                </div>
            </section>
            <section id="History">
                <h2>History</h2>
                <div>
                    <ul></ul>
                </div>
            </section>
        </div>
    </main>
</body>
<script>
    const main = () => {
        const state = {
            myName: ""
        }


        function logError(msg) {
            console.log(msg);
        }
        function handleConnected(ws) {
            console.log("Connected to server ...");
            handleMessage(ws, "Welcome!");

            window.onbeforeunload = function () {
                //tell server user has left your site
                ws.send(JSON.stringify({
                    topic: "leave",
                    data: state.myName
                }));
            };
        }
        function handleMessage(ws, data) {
            console.log("SERVER >> " + data);
            try {
                const serverState = JSON.parse(data);

                const votes = Object.values(serverState.users).map((user) => {
                    return user.vote;
                });

                console.log('votes', votes)

                const numVoted = votes.filter((vote) => vote !== null).length;
                const average = votes.reduce((a, b) => a + b, 0) / numVoted || "no votes"

                // update participants
                document.querySelector("#Participants ul").innerHTML = Object.values(serverState.users).map((user) => {
                    return `<li style="color: ${user.color};">${user.name}</li>`;
                }).join("");

                // update issue
                document.querySelector("#IssueDescription").innerText = serverState.issue;

                // update result
                document.querySelector("#ResultAverage p").innerText = average;
                document.querySelector("#ResultNumVoted p").innerText = `${numVoted} / ${Object.keys(serverState.users).length}`;

                // update history
                console.log('hist', serverState.history)
                document.querySelector("#History ul").innerHTML = serverState.history.map(({ message, color }) => {
                    return `<li style="color: ${color};">${message}</li>`;
                }).join("");

            } catch (error) {
                console.log('server didnt send json')
            }
        }
        function handleError(e) {
            console.log(e instanceof ErrorEvent ? e.message : e.type);
        }

        try {

            const ws = new WebSocket("ws://localhost:3333");
            ws.onopen = () => handleConnected(ws);
            ws.onmessage = (m) => handleMessage(ws, m.data);
            ws.onclose = () => logError("Disconnected from server ...");
            ws.onerror = (e) => handleError(e);

            // send name on join
            const joinForm = document.querySelector("#Join form");
            const nameInput = document.querySelector("#Join form #Name");
            joinForm.addEventListener("submit", (e) => {
                e.preventDefault();
                const name = nameInput.value;
                const uniqueName = name + Math.floor(Math.random() * 1000);
                console.log("Joining as " + name);
                // send name to server
                ws.send(JSON.stringify({
                    topic: "join",
                    data: { name: uniqueName }
                }));
                // store name in state
                state.myName = uniqueName;
                // hide join form
                document.querySelector("#Join").style.display = "none";
                // show authed sections
                document.querySelectorAll(".authed").forEach((el) => {
                    el.style.display = "block";
                });
            });

            // send issue on change
            const issueForm = document.querySelector("#Issue form");
            const issueInput = document.querySelector("#Issue form #Issue");
            issueForm.addEventListener("submit", (e) => {
                e.preventDefault();
                const issue = issueInput.value;
                console.log("Changing issue to " + issue);
                // send issue to server
                ws.send(JSON.stringify({
                    topic: "issue",
                    data: issue
                }));
            });

            // clear issue
            const clearIssueButton = document.querySelector("#Issue form button");
            clearIssueButton.addEventListener("click", (e) => {
                e.preventDefault();
                console.log("Clearing issue");
                // send issue to server
                ws.send(JSON.stringify({
                    topic: "issue",
                    data: ""
                }));
            });

            // send vote on estimation
            const estimationButtons = document.querySelectorAll("#EstimationButtons button");
            estimationButtons.forEach((button) => {
                button.addEventListener("click", (e) => {
                    const vote = parseInt(e.target.innerText);
                    console.log("Voting " + vote);
                    // send vote to server
                    ws.send(JSON.stringify({
                        topic: "vote",
                        data: {
                            name: state.myName,
                            vote: vote
                        }
                    }));
                });
            });
        } catch (err) {
            logError("Failed to connect to server ... exiting");
        }


    }

    document.addEventListener("DOMContentLoaded", main);
</script>

</html>

    `
}
