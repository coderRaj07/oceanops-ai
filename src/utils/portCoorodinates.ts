export const PORT_COORDINATES: Record<string, { lat: number; lon: number }> = {
    // **Indian Ports**
    'Mumbai':        { lat: 18.9450, lon: 72.8445 },   // :contentReference[oaicite:1]{index=1}
    'Chennai':       { lat: 13.1010, lon: 80.3000 },   // :contentReference[oaicite:2]{index=2}
    'Kolkata':       { lat: 22.5726, lon: 88.3639 },   // (city port fallback)
    'Goa':           { lat: 15.4909, lon: 73.8278 },   // (added for coastal routes)
  
    // **South Asia / Indian Ocean**
    'Colombo':       { lat: 6.9271,  lon: 79.8612 },   // :contentReference[oaicite:3]{index=3}
    'Hambantota':    { lat: 6.1225,  lon: 81.0933 },   // :contentReference[oaicite:4]{index=4}
  
    // **Southeast Asia**
    'Singapore':     { lat: 1.2667,  lon: 103.8167 },  // :contentReference[oaicite:5]{index=5}
  
    // **Middle East**
    'Dubai':         { lat: 25.2770, lon: 55.2962 },   // :contentReference[oaicite:6]{index=6}
    'Jebel Ali':     { lat: 25.0186, lon: 55.0638 },   // :contentReference[oaicite:7]{index=7}
  
    // **Europe**
    'Rotterdam':     { lat: 51.9265, lon: 4.4625 },    // :contentReference[oaicite:8]{index=8}
    'Hamburg':       { lat: 53.5170, lon: 9.9600 },    // :contentReference[oaicite:9]{index=9}
  
    // **North America / Latin America**
    'Los Angeles':   { lat: 33.7300, lon: -118.2625 }, // :contentReference[oaicite:10]{index=10}
    'Santos':        { lat: -23.9670, lon: -46.3300 }, // (Brazil major trade port)
  };
  