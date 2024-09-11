const InfoLabel = document.getElementById("info");
const OptionEx = document.getElementById("option");
const Selector = document.getElementById("selector");

let map;
let DRAW_BUSES;
let REGIONS = new Map();
let SELECTED_REGION = Selector.value.length ? Selector.value : "burnleybus" 

async function GetRegions() {
    return new Promise(async (resolve, reject) => {
        const packet = await fetch("./assets/config.json");
        const { regions } = await packet.json();
        resolve(regions);
    });
}

async function GetBuses() {
    return new Promise(async (resolve, reject) => {
        const packet = await fetch(`https://transdev.xhspkkecfo.workers.dev/?region=${SELECTED_REGION}`)
        const body = await packet.json();
        resolve(body);
    });
}

async function SelectorChanged() {
    const data = REGIONS.get(Selector.value);
    if (!data) return;

    SELECTED_REGION = data.region;
    map.setZoom(12);
    map.setCenter(new google.maps.LatLng(...data.location))
    DRAW_BUSES();
}

function CreateOption(name, region) {
    const node = OptionEx.cloneNode(true);
    node.textContent = name;
    node.value = region;
    node.style.visibility = "";
    Selector.appendChild(node);
}

const markers = [];

(async () => {
    const { ColorScheme } = await google.maps.importLibrary("core")
    const { Map } = await google.maps.importLibrary("maps");
    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
    
    const infoWindow = new google.maps.InfoWindow();

    DRAW_BUSES = async function() {
        for (const marker of markers) {
            marker.setMap(null);
            delete marker;
        }

        for (const vehicle of await GetBuses()) {
            let TimeMessage = "Bus is not live";
            if (vehicle.TimingStatus) {
                switch (vehicle.TimingStatus.Minutes) {
                    case 0:
                        TimeMessage = "Bus is due";
                        break;
                    case 1:
                        TimeMessage = `Expected at the next stop in ${vehicle.TimingStatus.Minutes} minute`;
                        break
                    default:
                        TimeMessage = `Expected at the next stop in ${vehicle.TimingStatus.Minutes} minutes`;
                        break;
                }
            }

            const content = document.createElement("div");
            {
                const label = document.createElement("p");
                label.textContent = `${vehicle.PublishedLineName} ${vehicle.DirectionRef == "inbound" ? "↑" : "↓"}`;
                label.style.color = "white";
                label.style.margin = 0;
                label.style.textShadow = "#000 0px 0px 1px";

                const icon = document.createElement("img");
                icon.src = vehicle.DirectionRef == "inbound" ? "./assets/bus.png" : "./assets/bus-outbound.png";
                icon.style.padding = 0;
                content.append(label, icon);
            }

            const marker = new AdvancedMarkerElement({
                map,
                position: new google.maps.LatLng(vehicle.Latitude, vehicle.Longitude),
                content,
                title: vehicle.PublishedLineName
            });

            marker.addListener("click", () => {
                if (infoWindow.getMap()) {
                    infoWindow.close();
                }

                infoWindow.setContent(`
                    <h2 style="color: white; margin: 0px;">
                        ${vehicle.PublishedLineName} - ${vehicle.DestinationStopName}
                    </h2>
                        
                    <p style="color: white; padding: 0px;">${TimeMessage}</p>
                    <p style="color: white; padding: 0px;">Destination: ${vehicle.DestinationStopName}</p>
                    <p style="color: white; padding: 0px;">Depature: ${new Date(vehicle.DepartureTime).toLocaleString().split(", ").pop()}</p>
                    <p style="color: white; padding: 0px;">Stationary: ${vehicle.VehicleAtStop ? "Yes" : "No"}</p>
                    <p style="color: white; padding: 0px;">Last Updated: ${new Date(vehicle.RecordedAtTime).toLocaleString().split(", ").pop()}</p>
                `)
                infoWindow.open(map, marker);
            });
            markers.push(marker);
        }
    }

    for (const { name, region, location } of await GetRegions()) {
        REGIONS.set(region, { name, region, location });
        CreateOption(name, region);
    }

    OptionEx.remove();

    map = new Map(document.getElementById("map"), {
        center: { lat: 53.8066444, lng: -2.2165129 },
        zoom: 10,
        mapId: "cbf69ebacddf3999",
        mapTypeControl: false,
        streetViewControl: false,
        colorScheme: ColorScheme.DARK,
        gestureHandling: "greedy"
    });

    DRAW_BUSES();
    
    let counter = 0;
    setInterval(() => {
        if (counter == 15) {
            DRAW_BUSES();
            counter = 0;
            return InfoLabel.textContent = `Updates in 15 seconds...`;
        }

        InfoLabel.textContent = `Updates in ${15 - counter} seconds...`;
        counter++;
    }, 1000);

    navigator.geolocation.getCurrentPosition((position) => {
        map.setZoom(12);
        map.setCenter(new google.maps.LatLng(position.coords.latitude, position.coords.longitude))
    });
})();