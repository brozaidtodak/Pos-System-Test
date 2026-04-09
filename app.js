const SUPABASE_URL = "https://asehjdnfzoypbwfeazra.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzZWhqZG5mem95cGJ3ZmVhenJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2MjE2NjMsImV4cCI6MjA5MTE5NzY2M30.34nAhmcNO_xN73OdsyxayKl_jipIk-M8DIBgibAOdaI";

let db = null;
try {
    if(SUPABASE_URL === "PASTE_URL_DISINI") {
        console.warn("SILA MASUKKAN SUPABASE URL DAN KEY!");
    } else {
        db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
} catch (e) {
    console.error("API Error: ", e.message);
}


// Pagination Defaults
let publicCurrentPage = 1;
let posCurrentPage = 1;
const itemsPerPage = 21;
let lastPosSearchTerm = "";

window.changePublicPage = function(dir) {
    publicCurrentPage += dir;
    renderPublicStorefront();
    // Scroll slightly up or to top of catalog (optional, but good UX)
    document.getElementById('publicProductsList').parentElement.scrollTop = 0;
}
window.changePosPage = function(dir) {
    posCurrentPage += dir;
    renderPOS(lastPosSearchTerm);
    document.getElementById('productsList').parentElement.scrollTop = 0;
}
// Memory State
let masterProducts = [
    {
        "sku": "BD001",
        "name": "Tunnel tent",
        "category": "Camping Tent",
        "price": 1799.0,
        "is_published": true,
        "brand": "BLACKDOG",
        "images": [
            "https://loremflickr.com/500/500/camping?lock=1"
        ]
    },
    {
        "sku": "BD002",
        "name": "Hexagon tarp PU",
        "category": "Flysheet / Tarp / Canopy",
        "price": 227.0,
        "is_published": true,
        "brand": "BLACKDOG",
        "images": [
            "https://loremflickr.com/500/500/camping?lock=2"
        ]
    },
    {
        "sku": "BD003",
        "name": "Hexagon tarp silver coated",
        "category": "Flysheet / Tarp / Canopy",
        "price": 327.0,
        "is_published": true,
        "brand": "BLACKDOG",
        "images": [
            "https://loremflickr.com/500/500/camping?lock=3"
        ]
    },
    {
        "sku": "BD004",
        "name": "Large Hexagon tarp",
        "category": "Flysheet / Tarp / Canopy",
        "price": 459.0,
        "is_published": true,
        "brand": "BLACKDOG",
        "images": [
            "https://loremflickr.com/500/500/camping?lock=4"
        ]
    },
    {
        "sku": "BD005",
        "name": "Ultrasonic picnic mat",
        "category": "Accessories",
        "price": 95.0,
        "is_published": true,
        "brand": "BLACKDOG",
        "images": [
            "https://loremflickr.com/500/500/camping?lock=5"
        ]
    },
    {
        "sku": "BD005#",
        "name": "BLACKDOG Ultrasonic picnic mat",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp",
        "images": [
            "https://loremflickr.com/500/500/camping?lock=6"
        ]
    },
    {
        "sku": "BD006",
        "name": "Atmosphere Lamp",
        "category": "Lighting & Lamp",
        "price": 93.0,
        "is_published": true,
        "brand": "BLACKDOG",
        "images": [
            "https://loremflickr.com/500/500/camping?lock=7"
        ]
    },
    {
        "sku": "BD007",
        "name": "Mini Retro Camping Hanging Lamp",
        "category": "Lighting & Lamp",
        "price": 97.0,
        "is_published": true,
        "brand": "BLACKDOG",
        "images": [
            "https://loremflickr.com/500/500/camping?lock=8"
        ]
    },
    {
        "sku": "BD008",
        "name": "Camping cart\uff08City walk)",
        "category": "Accessories",
        "price": 211.0,
        "is_published": true,
        "brand": "BLACKDOG",
        "images": [
            "https://loremflickr.com/500/500/camping?lock=9"
        ]
    },
    {
        "sku": "BD008#",
        "name": "BLACKDOG camping cart\uff08City walk)",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp",
        "images": [
            "https://loremflickr.com/500/500/camping?lock=10"
        ]
    },
    {
        "sku": "BD009",
        "name": "Four-way folding cart",
        "category": "Accessories",
        "price": 412.0,
        "is_published": true,
        "brand": "BLACKDOG",
        "images": [
            "https://loremflickr.com/500/500/camping?lock=11"
        ]
    },
    {
        "sku": "BD009#",
        "name": "Moutain shade Pro-camping cart",
        "category": "Uncategorized",
        "price": 390.0,
        "is_published": true,
        "brand": "10camp",
        "images": [
            "https://loremflickr.com/500/500/camping?lock=12"
        ]
    },
    {
        "sku": "BD010",
        "name": "Light feathered moon chair",
        "category": "Table & Chair",
        "price": 189.0,
        "is_published": true,
        "brand": "BLACKDOG",
        "images": [
            "https://loremflickr.com/500/500/camping?lock=13"
        ]
    },
    {
        "sku": "BD010#",
        "name": "Light feathered moon chair",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp",
        "images": [
            "https://loremflickr.com/500/500/camping?lock=14"
        ]
    },
    {
        "sku": "BD011",
        "name": "Mountain Soul - Kermit folding chair",
        "category": "Table & Chair",
        "price": 79.0,
        "is_published": true,
        "brand": "BLACKDOG",
        "images": [
            "https://loremflickr.com/500/500/camping?lock=15"
        ]
    },
    {
        "sku": "BD012",
        "name": "(IGT) Camping Accessories storage bag",
        "category": "Accessories",
        "price": 119.0,
        "is_published": true,
        "brand": "BLACKDOG",
        "images": [
            "https://loremflickr.com/500/500/camping?lock=16"
        ]
    },
    {
        "sku": "BD013",
        "name": "Double folding chair",
        "category": "Table & Chair",
        "price": 199.0,
        "is_published": true,
        "brand": "BLACKDOG",
        "images": [
            "https://loremflickr.com/500/500/camping?lock=17"
        ]
    },
    {
        "sku": "BD013#",
        "name": "BLACKDOG double folding chair",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp",
        "images": [
            "https://loremflickr.com/500/500/camping?lock=18"
        ]
    },
    {
        "sku": "BD014",
        "name": "Blackdog one bedrooms & One Living Room automatic tent 2.0",
        "category": "Camping Tent",
        "price": 99.0,
        "is_published": true,
        "brand": "BLACKDOG",
        "images": [
            "https://loremflickr.com/500/500/camping?lock=19"
        ]
    },
    {
        "sku": "BD014#",
        "name": "Chasing the stars Blackdog one bedrooms & One Living Room  automatic tent 2.0",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp",
        "images": [
            "https://loremflickr.com/500/500/camping?lock=20"
        ]
    },
    {
        "sku": "BD015",
        "name": "Quick-opening canopy door curtain",
        "category": "Flysheet / Tarp / Canopy",
        "price": 99.0,
        "is_published": true,
        "brand": "BLACKDOG",
        "images": [
            "https://loremflickr.com/500/500/camping?lock=21"
        ]
    },
    {
        "sku": "BD016",
        "name": "Quick-opening canopy",
        "category": "Flysheet / Tarp / Canopy",
        "price": 99.0,
        "is_published": true,
        "brand": "BLACKDOG"
    },
    {
        "sku": "BD019",
        "name": "Mimi portable round table",
        "category": "Table & Chair",
        "price": 99.0,
        "is_published": true,
        "brand": "BLACKDOG"
    },
    {
        "sku": "BD020",
        "name": "BLACKDOG IGT folding table",
        "category": "Table & Chair",
        "price": 99.0,
        "is_published": true,
        "brand": "BLACKDOG"
    },
    {
        "sku": "BD021",
        "name": "BLACKDOG Floating Moon Outdoor Folding Chair",
        "category": "Table & Chair",
        "price": 99.0,
        "is_published": true,
        "brand": "BLACKDOG"
    },
    {
        "sku": "BD022",
        "name": "BLACKDOG Floating Moon Outdoor Folding Chair",
        "category": "Table & Chair",
        "price": 99.0,
        "is_published": true,
        "brand": "BLACKDOG"
    },
    {
        "sku": "BD023",
        "name": "BLACKDOG (IGT) Camping Combination Table Accessories",
        "category": "Accessories",
        "price": 99.0,
        "is_published": true,
        "brand": "BLACKDOG"
    },
    {
        "sku": "BD024",
        "name": "BLACKDOG (IGT) Camping Combination Table Accessories",
        "category": "Accessories",
        "price": 99.0,
        "is_published": true,
        "brand": "BLACKDOG"
    },
    {
        "sku": "BD025",
        "name": "BLACKDOG (IGT) Camping Combination Table Accessories",
        "category": "Accessories",
        "price": 99.0,
        "is_published": true,
        "brand": "BLACKDOG"
    },
    {
        "sku": "BD026",
        "name": "BLACKDOG (IGT) Camping Combination Table Accessories",
        "category": "Accessories",
        "price": 99.0,
        "is_published": true,
        "brand": "BLACKDOG"
    },
    {
        "sku": "BD027",
        "name": "BLACKDOG (IGT) Camping Combination Table Accessories",
        "category": "Accessories",
        "price": 99.0,
        "is_published": true,
        "brand": "BLACKDOG"
    },
    {
        "sku": "BD028",
        "name": "BLACKDOG (IGT) Camping Combination Table Accessories",
        "category": "Accessories",
        "price": 99.0,
        "is_published": true,
        "brand": "BLACKDOG"
    },
    {
        "sku": "BD032",
        "name": "BLACKDOG Ultrasonic aluminum film picnic mat",
        "category": "Accessories",
        "price": 99.0,
        "is_published": true,
        "brand": "BLACKDOG"
    },
    {
        "sku": "BD033",
        "name": "BLACKDOG Foam Automatic Inflatable Pillow",
        "category": "Accessories",
        "price": 99.0,
        "is_published": true,
        "brand": "BLACKDOG"
    },
    {
        "sku": "BD034",
        "name": "BLACKDOG Ultrasonic Picnic Mat",
        "category": "Accessories",
        "price": 99.0,
        "is_published": true,
        "brand": "BLACKDOG"
    },
    {
        "sku": "BD034#",
        "name": "BLACKDOG Ultrasonic Picnic Mat",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "BD035",
        "name": "BLACKDOG Ultrasonic picnic mat",
        "category": "Accessories",
        "price": 95.0,
        "is_published": true,
        "brand": "BLACKDOG"
    },
    {
        "sku": "BD036",
        "name": "BLACKDOG camping light",
        "category": "Lighting & Lamp",
        "price": 99.0,
        "is_published": true,
        "brand": "BLACKDOG"
    },
    {
        "sku": "BD037",
        "name": "BLACKDOG camping light",
        "category": "Lighting & Lamp",
        "price": 99.0,
        "is_published": true,
        "brand": "BLACKDOG"
    },
    {
        "sku": "BD038",
        "name": "camping cart table board-only for CBD2300JJ023",
        "category": "Accessories",
        "price": 99.0,
        "is_published": true,
        "brand": "BLACKDOG"
    },
    {
        "sku": "BD038#",
        "name": "camping cart table board-only for CBD2300JJ023",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "BD039",
        "name": "Happy summer-Camping incubator",
        "category": "Storage / Bucket / Bag",
        "price": 99.0,
        "is_published": true,
        "brand": "BLACKDOG"
    },
    {
        "sku": "BD039#",
        "name": "Happy summer-Camping incubator",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "BD040",
        "name": "Happy summer-Camping incubator",
        "category": "Storage / Bucket / Bag",
        "price": 99.0,
        "is_published": true,
        "brand": "BLACKDOG"
    },
    {
        "sku": "BD040#",
        "name": "Happy summer-Camping incubator",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "BD041",
        "name": "Iceland-Outdoor incubator",
        "category": "Storage / Bucket / Bag",
        "price": 99.0,
        "is_published": true,
        "brand": "BLACKDOG"
    },
    {
        "sku": "BD041#",
        "name": "Iceland-Outdoor incubator",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "BD042",
        "name": "Folding desktop shelf",
        "category": "Accessories",
        "price": 99.0,
        "is_published": true,
        "brand": "BLACKDOG"
    },
    {
        "sku": "BD043",
        "name": "BLACKDOG Car storage box",
        "category": "Storage / Bucket / Bag",
        "price": 99.0,
        "is_published": true,
        "brand": "BLACKDOG"
    },
    {
        "sku": "BD045",
        "name": "BLACKDOG PP folding storage box",
        "category": "Storage / Bucket / Bag",
        "price": 99.0,
        "is_published": true,
        "brand": "BLACKDOG"
    },
    {
        "sku": "BD045#",
        "name": "BLACKDOG PP folding storage box",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "BD046",
        "name": "BLACKDOG Camping PP cooler box",
        "category": "Storage / Bucket / Bag",
        "price": 99.0,
        "is_published": true,
        "brand": "BLACKDOG"
    },
    {
        "sku": "BD046#",
        "name": "BLACKDOG Camping PP cooler box",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "BD047",
        "name": "Dinner party gas stove",
        "category": "Cookware & Tableware",
        "price": 99.0,
        "is_published": true,
        "brand": "BLACKDOG"
    },
    {
        "sku": "BD047#",
        "name": "Dinner party gas stove",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "BD048",
        "name": "Portable gas stove",
        "category": "Cookware & Tableware",
        "price": 99.0,
        "is_published": true,
        "brand": "BLACKDOG"
    },
    {
        "sku": "BD049",
        "name": "IGT charcoal stove",
        "category": "Cookware & Tableware",
        "price": 99.0,
        "is_published": true,
        "brand": "BLACKDOG"
    },
    {
        "sku": "BD050",
        "name": "BLACKDOG enamel milk pan",
        "category": "Cookware & Tableware",
        "price": 99.0,
        "is_published": true,
        "brand": "BLACKDOG"
    },
    {
        "sku": "BD051",
        "name": "BLACKDOG tea pot",
        "category": "Cookware & Tableware",
        "price": 99.0,
        "is_published": true,
        "brand": "BLACKDOG"
    },
    {
        "sku": "BD052",
        "name": "BLACKDOG Sweet Cool Cup",
        "category": "Cookware & Tableware",
        "price": 99.0,
        "is_published": true,
        "brand": "BLACKDOG"
    },
    {
        "sku": "BD053",
        "name": "BLACKDOG pink cup",
        "category": "Cookware & Tableware",
        "price": 99.0,
        "is_published": true,
        "brand": "BLACKDOG"
    },
    {
        "sku": "BD054",
        "name": "Outdoor tote bag",
        "category": "Storage / Bucket / Bag",
        "price": 99.0,
        "is_published": true,
        "brand": "BLACKDOG"
    },
    {
        "sku": "BD055",
        "name": "Big storage bag",
        "category": "Storage / Bucket / Bag",
        "price": 99.0,
        "is_published": true,
        "brand": "BLACKDOG"
    },
    {
        "sku": "BD055#",
        "name": "Big storage bag",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "BD056",
        "name": "portable bag",
        "category": "Storage / Bucket / Bag",
        "price": 99.0,
        "is_published": true,
        "brand": "BLACKDOG"
    },
    {
        "sku": "BD057",
        "name": "BLACKDOG Multifunctional shopping bag",
        "category": "Storage / Bucket / Bag",
        "price": 99.0,
        "is_published": true,
        "brand": "BLACKDOG"
    },
    {
        "sku": "BD057#",
        "name": "BLACKDOG Multifunctional shopping bag",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "BD058",
        "name": "BLACKDOG Camping atmosphere flags",
        "category": "Accessories",
        "price": 99.0,
        "is_published": true,
        "brand": "BLACKDOG"
    },
    {
        "sku": "BD059",
        "name": "BLACKDOG camping equipment storage bag",
        "category": "Storage / Bucket / Bag",
        "price": 99.0,
        "is_published": true,
        "brand": "BLACKDOG"
    },
    {
        "sku": "BD059#",
        "name": "BLACKDOG camping equipment storage bag",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "BD060",
        "name": "BLACKDOG Traveler folding storage basket",
        "category": "Storage / Bucket / Bag",
        "price": 99.0,
        "is_published": true,
        "brand": "BLACKDOG"
    },
    {
        "sku": "BD061",
        "name": "BLACKDOG Stainless Steel Tableware Set",
        "category": "Cookware & Tableware",
        "price": 99.0,
        "is_published": true,
        "brand": "BLACKDOG"
    },
    {
        "sku": "BD062",
        "name": "BLACKDOG Hexagon tarp silver coated",
        "category": "Flysheet / Tarp / Canopy",
        "price": 327.0,
        "is_published": true,
        "brand": "BLACKDOG"
    },
    {
        "sku": "BD063",
        "name": "Chasing the stars 5.9 automatic tent",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "BD064",
        "name": "Ground cloth\uff08for CBD2450WS028 CBD2300ZP012\uff09",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "BD065",
        "name": "Nebula - Hexagonal canopy",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "BD066",
        "name": "RHE arc edge large canopy",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "BD067",
        "name": "Quick-opening canopy",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "BD068",
        "name": "Quick-opening canopy door curtain",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "BD069",
        "name": "Unicorn bedroom tent",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "BD070",
        "name": "Double-layered folding table",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "BD071",
        "name": "Folding camping stool",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "BD072",
        "name": "Square rocking chair",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "BD073",
        "name": "BLACKDOG camping casual inflatablesofa",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "BD074",
        "name": "(Simian)Envelope sleeping bag",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "BD075",
        "name": "(Simian)Envelope sleeping bag",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "BD076",
        "name": "Rong yan-Automatic inflatable bed",
        "category": "Uncategorized",
        "price": 250.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "BD077",
        "name": "Ultrasonic aluminum film picnic mat",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "BD078",
        "name": "Ambient camping light",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "BD079",
        "name": "Moutain shade-camping cart",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "BD080",
        "name": "(Moutain shade Pro)-camping cart table board-only for BD-TC002",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "BD081",
        "name": "BLACKDOG Plastic cooler box",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "BD082",
        "name": "BLACKDOG windproof rope regulator",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "BD083",
        "name": "BLACKDOG cast iron Camping Hammer",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "BD084",
        "name": "BLACKDOG aluminum alloy double head hook",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "BD085",
        "name": "All-terrain double-sided camping light",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "BD086",
        "name": "Carrot atmosphere hanging lights",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "CD001",
        "name": "( Tent 4-6 people )",
        "category": "Camping Tent",
        "price": 2231.0,
        "is_published": true,
        "brand": "CHANODUG"
    },
    {
        "sku": "CD002",
        "name": "(Roof 6-8 people )",
        "category": "Camping Tent",
        "price": 1097.0,
        "is_published": true,
        "brand": "CHANODUG"
    },
    {
        "sku": "CD003",
        "name": "(Inflatable tent with canopy.)",
        "category": "Camping Tent",
        "price": 1600.0,
        "is_published": true,
        "brand": "CHANODUG"
    },
    {
        "sku": "CD004",
        "name": "(2-3 people with a teapot set)",
        "category": "Cookware & Tableware",
        "price": 65.0,
        "is_published": true,
        "brand": "CHANODUG"
    },
    {
        "sku": "CD005",
        "name": "(3-5 people with a teapot set)",
        "category": "Cookware & Tableware",
        "price": 99.0,
        "is_published": true,
        "brand": "CHANODUG"
    },
    {
        "sku": "CD006",
        "name": "(4.2 liters hanging pot)",
        "category": "Cookware & Tableware",
        "price": 42.0,
        "is_published": true,
        "brand": "CHANODUG"
    },
    {
        "sku": "CD007",
        "name": "(12-piece set of hanging pot set pot)",
        "category": "Cookware & Tableware",
        "price": 135.0,
        "is_published": true,
        "brand": "CHANODUG"
    },
    {
        "sku": "CD008",
        "name": "(extra-large 3-5 people set pot)",
        "category": "Cookware & Tableware",
        "price": 91.0,
        "is_published": true,
        "brand": "CHANODUG"
    },
    {
        "sku": "CD009",
        "name": "(Double stove camping gas stove)",
        "category": "Cookware & Tableware",
        "price": 245.0,
        "is_published": true,
        "brand": "CHANODUG"
    },
    {
        "sku": "CD010",
        "name": "(3KG mechanical charcoal barbecue carbon)",
        "category": "Cookware & Tableware",
        "price": 18.0,
        "is_published": true,
        "brand": "CHANODUG"
    },
    {
        "sku": "CD011",
        "name": "(Solid alcohol)",
        "category": "Cookware & Tableware",
        "price": 4.0,
        "is_published": true,
        "brand": "CHANODUG"
    },
    {
        "sku": "CD012",
        "name": "(Small IGT camping table)",
        "category": "Cookware & Tableware",
        "price": 205.0,
        "is_published": true,
        "brand": "CHANODUG"
    },
    {
        "sku": "CD013",
        "name": "(Large IGT camping table)",
        "category": "Cookware & Tableware",
        "price": 221.0,
        "is_published": true,
        "brand": "CHANODUG"
    },
    {
        "sku": "CD014",
        "name": "(60*90 folding table)",
        "category": "Table & Chair",
        "price": 110.0,
        "is_published": true,
        "brand": "CHANODUG"
    },
    {
        "sku": "CD015",
        "name": "(IGT lifting table)",
        "category": "Cookware & Tableware",
        "price": 211.0,
        "is_published": true,
        "brand": "CHANODUG"
    },
    {
        "sku": "CD015#",
        "name": "IGT lift table",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "CD016",
        "name": "( IGT oven)",
        "category": "Cookware & Tableware",
        "price": 81.0,
        "is_published": true,
        "brand": "CHANODUG"
    },
    {
        "sku": "CD017",
        "name": "(High-grade sponge pillow)",
        "category": "Camp Bed & Mattress",
        "price": 35.0,
        "is_published": true,
        "brand": "CHANODUG"
    },
    {
        "sku": "CD017#",
        "name": "(with logo) 3D comfortable and silent sponge pillow",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "CD018",
        "name": "(Light luxury double edging bed)",
        "category": "Camp Bed & Mattress",
        "price": 209.0,
        "is_published": true,
        "brand": "CHANODUG"
    },
    {
        "sku": "CD019",
        "name": "(32-hole single built-in pump flocking inflatable bed)",
        "category": "Camp Bed & Mattress",
        "price": 99.0,
        "is_published": true,
        "brand": "CHANODUG"
    },
    {
        "sku": "CD019#",
        "name": "32-hole single built-in pump flocked inflatable bed",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "CD020",
        "name": "(48-hole three-person built-in pump flocking inflatable bed)",
        "category": "Camp Bed & Mattress",
        "price": 125.0,
        "is_published": true,
        "brand": "CHANODUG"
    },
    {
        "sku": "CD020#",
        "name": "48-hole three-person flocked inflatable bed with built-in pump",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "CD021",
        "name": "(21-Hole Single-Person Built-in Pump Plush Inflatable Bed)",
        "category": "Camp Bed & Mattress",
        "price": 153.0,
        "is_published": true,
        "brand": "CHANODUG"
    },
    {
        "sku": "CD022",
        "name": "(35-Hole Double High Bed with Built-in Pump)",
        "category": "Camp Bed & Mattress",
        "price": 175.0,
        "is_published": true,
        "brand": "CHANODUG"
    },
    {
        "sku": "CD022#",
        "name": "35-hole double high bed with built-in pump",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "CD023",
        "name": "(Long table five-piece set folding table and chair)",
        "category": "Table & Chair",
        "price": 259.0,
        "is_published": true,
        "brand": "CHANODUG"
    },
    {
        "sku": "CD023#",
        "name": "long table five-piece folding table and chairs set",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "CD024",
        "name": "(8963 lifting table) medium",
        "category": "Table & Chair",
        "price": 181.0,
        "is_published": true,
        "brand": "CHANODUG"
    },
    {
        "sku": "CD025",
        "name": "(12760 lifting table) Large",
        "category": "Table & Chair",
        "price": 240.0,
        "is_published": true,
        "brand": "CHANODUG"
    },
    {
        "sku": "CD025#",
        "name": "12760 lift table",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "CD026",
        "name": "(IGT elevating barbecue table)",
        "category": "Cookware & Tableware",
        "price": 215.0,
        "is_published": true,
        "brand": "CHANODUG"
    },
    {
        "sku": "CD026#",
        "name": "IGT lifting barbecue table",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "CD027",
        "name": "( Kirin Stove - portable gas stove)",
        "category": "Cookware & Tableware",
        "price": 215.0,
        "is_published": true,
        "brand": "CHANODUG"
    },
    {
        "sku": "CD027#",
        "name": "Kirin stove-portable gas stove",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "CD028",
        "name": "(8040 net table)",
        "category": "Table & Chair",
        "price": 85.0,
        "is_published": true,
        "brand": "CHANODUG"
    },
    {
        "sku": "CD028#",
        "name": "8040 network table SMALL",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "CD029",
        "name": "(Cart density table board)",
        "category": "Table & Chair",
        "price": 69.0,
        "is_published": true,
        "brand": "CHANODUG"
    },
    {
        "sku": "CD030",
        "name": "( Outdoor camping rack )",
        "category": "Table & Chair",
        "price": 97.0,
        "is_published": true,
        "brand": "CHANODUG"
    },
    {
        "sku": "CD031",
        "name": "( net table )",
        "category": "Table & Chair",
        "price": 45.0,
        "is_published": true,
        "brand": "CHANODUG"
    },
    {
        "sku": "CD032",
        "name": "( Dinner board in online table )",
        "category": "Table & Chair",
        "price": 29.0,
        "is_published": true,
        "brand": "CHANODUG"
    },
    {
        "sku": "CD033",
        "name": "(Large aluminum triangular storage rack)",
        "category": "Accessories",
        "price": 62.0,
        "is_published": true,
        "brand": "CHANODUG"
    },
    {
        "sku": "CD034",
        "name": "(Medium aluminum triangular storage rack)",
        "category": "Accessories",
        "price": 52.0,
        "is_published": true,
        "brand": "CHANODUG"
    },
    {
        "sku": "CD035",
        "name": "(premium camper trailer)",
        "category": "Accessories",
        "price": 291.0,
        "is_published": true,
        "brand": "CHANODUG"
    },
    {
        "sku": "CD036",
        "name": "(Four-fold off-road cart)",
        "category": "Accessories",
        "price": 240.0,
        "is_published": true,
        "brand": "CHANODUG"
    },
    {
        "sku": "CD037",
        "name": "(Trolley egg roll table board)",
        "category": "Accessories",
        "price": 85.0,
        "is_published": true,
        "brand": "CHANODUG"
    },
    {
        "sku": "CD038",
        "name": "( Desktop light pole stand ) Black",
        "category": "Accessories",
        "price": 29.0,
        "is_published": true,
        "brand": "CHANODUG"
    },
    {
        "sku": "CD038#",
        "name": "Desktop Light Pole",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "CD039",
        "name": "( Desktop light pole stand ) Blue",
        "category": "Accessories",
        "price": 29.0,
        "is_published": true,
        "brand": "CHANODUG"
    },
    {
        "sku": "CD040",
        "name": "( Desktop light pole stand ) Red",
        "category": "Accessories",
        "price": 29.0,
        "is_published": true,
        "brand": "CHANODUG"
    },
    {
        "sku": "CD041",
        "name": "50L (Outdoor folding storage box)",
        "category": "Accessories",
        "price": 36.0,
        "is_published": true,
        "brand": "CHANODUG"
    },
    {
        "sku": "CD041#",
        "name": "50L outdoor folding storage box",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "CD042",
        "name": "50L (Outdoor folding storage box)",
        "category": "Accessories",
        "price": 36.0,
        "is_published": true,
        "brand": "CHANODUG"
    },
    {
        "sku": "CD042#",
        "name": "50L outdoor folding storage box",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "CD043",
        "name": "50L (Outdoor folding storage box)",
        "category": "Accessories",
        "price": 36.0,
        "is_published": true,
        "brand": "CHANODUG"
    },
    {
        "sku": "CD043#",
        "name": "50L outdoor folding storage box",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "CD044",
        "name": "30L(Outdoor folding storage box)",
        "category": "Accessories",
        "price": 27.0,
        "is_published": true,
        "brand": "CHANODUG"
    },
    {
        "sku": "CD045",
        "name": "30L(Outdoor folding storage box)",
        "category": "Accessories",
        "price": 27.0,
        "is_published": true,
        "brand": "CHANODUG"
    },
    {
        "sku": "CD046",
        "name": "30L(Outdoor folding storage box)",
        "category": "Accessories",
        "price": 27.0,
        "is_published": true,
        "brand": "CHANODUG"
    },
    {
        "sku": "CD047",
        "name": "( Desktop light pole stand ) Turquoise",
        "category": "Accessories",
        "price": 29.0,
        "is_published": true,
        "brand": "CHANODUG"
    },
    {
        "sku": "CD048",
        "name": "changing tent",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "CD074",
        "name": "changing tent",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "CD049",
        "name": "black ordinary floor nails 20cm",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "CD050",
        "name": "black ordinary floor nails 30cm",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "CD051",
        "name": "black ordinary floor nails 40cm",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "CD052",
        "name": "self-charging pad",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "CD053",
        "name": "large plastic folding stool",
        "category": "Uncategorized",
        "price": 20.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "CD054",
        "name": "small plastic folding stool",
        "category": "Uncategorized",
        "price": 16.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "CD055",
        "name": "95CM carbon steel egg roll table",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "CD056",
        "name": "120 carbon steel folding table 600D Oxford cloth bag",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "CD057",
        "name": "12060 net desk LARGE",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "CD058",
        "name": "9060 Internet Desk MEDIUM",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "CD059",
        "name": "large back chair",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "CD061",
        "name": "Outdoor survival tool set",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "CD062",
        "name": "high-end umbrella hook",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "CD063",
        "name": "Eight-eyed aluminum sheet with rope buckle",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "CD064",
        "name": "triangular aluminum sheet Shanuoduoji LOGO",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "CD065",
        "name": "Colored Wood Ax",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "CD066",
        "name": "copper hammer",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "CD067",
        "name": "pig tail light hook",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "CD068",
        "name": "Carabiner 12 card",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "CD069",
        "name": "No. 8 carabiner",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "CD070",
        "name": "130*210 emergency blanket with one side gold and one",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "CD071",
        "name": "EVA first aid kit",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "CD072",
        "name": "Three-person inflatable low bed with built-in pump (56 holes)",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "CD073",
        "name": "Three-person high-rise inflatable high bed with built-in pump (49 holes)",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "CD075",
        "name": "large plastic folding stool",
        "category": "Uncategorized",
        "price": 20.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "CD076",
        "name": "small plastic folding stool",
        "category": "Uncategorized",
        "price": 16.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "CD077",
        "name": "95CM carbon steel egg roll table",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "CD078",
        "name": "121 carbon steel folding table 600D Oxford cloth bag",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "LF001",
        "name": "CANOPY",
        "category": "Flysheet / Tarp / Canopy",
        "price": 349.0,
        "is_published": true,
        "brand": "LFO"
    },
    {
        "sku": "LF003",
        "name": "XS Auto Tent Single Layer Automatic Tent 1-2 Person",
        "category": "Camping Tent",
        "price": 99.0,
        "is_published": true,
        "brand": "LFO"
    },
    {
        "sku": "LF005",
        "name": "Single Layer Hydraulic automatic tent",
        "category": "Camping Tent",
        "price": 179.0,
        "is_published": true,
        "brand": "LFO"
    },
    {
        "sku": "LF010",
        "name": "INFLATABLE TENT",
        "category": "Camping Tent",
        "price": 1699.0,
        "is_published": true,
        "brand": "LFO"
    },
    {
        "sku": "LF018",
        "name": "PUNCAK BERKEMBAR UPGRADE",
        "category": "Flysheet / Tarp / Canopy",
        "price": 599.0,
        "is_published": true,
        "brand": "LFO"
    },
    {
        "sku": "LF020",
        "name": "PUNCAK BERKEMBAR BASIC",
        "category": "Flysheet / Tarp / Canopy",
        "price": 499.0,
        "is_published": true,
        "brand": "LFO"
    },
    {
        "sku": "LF022",
        "name": "Butterfly Shade Canopy",
        "category": "Flysheet / Tarp / Canopy",
        "price": 219.0,
        "is_published": true,
        "brand": "LFO"
    },
    {
        "sku": "LF025",
        "name": "2-3\u4eba Kettle set",
        "category": "Cookware & Tableware",
        "price": 79.0,
        "is_published": true,
        "brand": "LFO"
    },
    {
        "sku": "LF026",
        "name": "4-5\u4eba Pot set",
        "category": "Cookware & Tableware",
        "price": 93.0,
        "is_published": true,
        "brand": "LFO"
    },
    {
        "sku": "LF027",
        "name": "LFO red bag",
        "category": "Accessories",
        "price": 169.0,
        "is_published": true,
        "brand": "LFO"
    },
    {
        "sku": "LF028",
        "name": "LFO black bag",
        "category": "Accessories",
        "price": 169.0,
        "is_published": true,
        "brand": "LFO"
    },
    {
        "sku": "LF029",
        "name": "LFO grey bag",
        "category": "Accessories",
        "price": 169.0,
        "is_published": true,
        "brand": "LFO"
    },
    {
        "sku": "MG001",
        "name": "ADJUSTABLE POLE",
        "category": "Peg & Pole",
        "price": 76.0,
        "is_published": true,
        "brand": "MOBI GARDEN"
    },
    {
        "sku": "MG002",
        "name": "CARBON STEEL TENT PEG 30",
        "category": "Peg & Pole",
        "price": 16.0,
        "is_published": true,
        "brand": "MOBI GARDEN"
    },
    {
        "sku": "MG003",
        "name": "CARBON STEEL TENT PEG 20",
        "category": "Peg & Pole",
        "price": 9.0,
        "is_published": true,
        "brand": "MOBI GARDEN"
    },
    {
        "sku": "MG004",
        "name": "DOUBLE BURNER 3.3",
        "category": "Cookware & Tableware",
        "price": 289.0,
        "is_published": true,
        "brand": "MOBI GARDEN"
    },
    {
        "sku": "MG005",
        "name": "MULTIFUNCTIONAL STOVE",
        "category": "Cookware & Tableware",
        "price": 240.0,
        "is_published": true,
        "brand": "MOBI GARDEN"
    },
    {
        "sku": "MG006",
        "name": "PORTABLE GAS STOVE 2.2 - White",
        "category": "Cookware & Tableware",
        "price": 111.0,
        "is_published": true,
        "brand": "MOBI GARDEN"
    },
    {
        "sku": "MG007",
        "name": "PORTABLE GAS STOVE 2.2 - Green",
        "category": "Cookware & Tableware",
        "price": 111.0,
        "is_published": true,
        "brand": "MOBI GARDEN"
    },
    {
        "sku": "MG008",
        "name": "PORTABLE GAS STOVE 2.2 - Black",
        "category": "Cookware & Tableware",
        "price": 111.0,
        "is_published": true,
        "brand": "MOBI GARDEN"
    },
    {
        "sku": "MG009",
        "name": "PORTABLE GAS STOVE 2.2 - Sand",
        "category": "Cookware & Tableware",
        "price": 111.0,
        "is_published": true,
        "brand": "MOBI GARDEN"
    },
    {
        "sku": "MG010",
        "name": "CLOTHES HANGER - Sand",
        "category": "Accessories",
        "price": 27.0,
        "is_published": true,
        "brand": "MOBI GARDEN"
    },
    {
        "sku": "MG011",
        "name": "CLOTHES HANGER - Green",
        "category": "Accessories",
        "price": 27.0,
        "is_published": true,
        "brand": "MOBI GARDEN"
    },
    {
        "sku": "MG012",
        "name": "CLOTHES HANGER - Orange",
        "category": "Accessories",
        "price": 27.0,
        "is_published": true,
        "brand": "MOBI GARDEN"
    },
    {
        "sku": "MG013",
        "name": "JY MOSQUITO COIL - Black",
        "category": "Accessories",
        "price": 75.0,
        "is_published": true,
        "brand": "MOBI GARDEN"
    },
    {
        "sku": "MG014",
        "name": "JY MOSQUITO COIL - Grey",
        "category": "Accessories",
        "price": 75.0,
        "is_published": true,
        "brand": "MOBI GARDEN"
    },
    {
        "sku": "MG015",
        "name": "CAMPING LIGHT - Sand",
        "category": "Lighting & Lamp",
        "price": 89.0,
        "is_published": true,
        "brand": "MOBI GARDEN"
    },
    {
        "sku": "MG016",
        "name": "CAMPING LIGHT - Green",
        "category": "Lighting & Lamp",
        "price": 89.0,
        "is_published": true,
        "brand": "MOBI GARDEN"
    },
    {
        "sku": "MG017",
        "name": "CAMPING LIGHT - Ivory",
        "category": "Lighting & Lamp",
        "price": 89.0,
        "is_published": true,
        "brand": "MOBI GARDEN"
    },
    {
        "sku": "MG018",
        "name": "TENT PEGS BAG",
        "category": "Accessories",
        "price": 25.0,
        "is_published": true,
        "brand": "MOBI GARDEN"
    },
    {
        "sku": "MG019",
        "name": "HOLIDAY STARS 300 TENT 70D",
        "category": "Camping Tent",
        "price": 799.0,
        "is_published": true,
        "brand": "MOBI GARDEN"
    },
    {
        "sku": "MG020",
        "name": "INNER TENT FOR HOLIDAY STARS",
        "category": "Camping Tent",
        "price": 169.0,
        "is_published": true,
        "brand": "MOBI GARDEN"
    },
    {
        "sku": "MG021",
        "name": "MAT FOR HOLIDAY STARS 300",
        "category": "Accessories",
        "price": 199.0,
        "is_published": true,
        "brand": "MOBI GARDEN"
    },
    {
        "sku": "MG022",
        "name": "MOON CHAIR",
        "category": "Table & Chair",
        "price": 69.0,
        "is_published": true,
        "brand": "MOBI GARDEN"
    },
    {
        "sku": "MG023",
        "name": "MOON CHAIR",
        "category": "Table & Chair",
        "price": 69.0,
        "is_published": true,
        "brand": "MOBI GARDEN"
    },
    {
        "sku": "MG024",
        "name": "DOORWAY MAT-VILLA",
        "category": "Accessories",
        "price": 45.0,
        "is_published": true,
        "brand": "MOBI GARDEN"
    },
    {
        "sku": "MG025",
        "name": "DOORWAY MAT",
        "category": "Accessories",
        "price": 45.0,
        "is_published": true,
        "brand": "MOBI GARDEN"
    },
    {
        "sku": "MG025#",
        "name": "DOORWAY MAT\n\u660e\u971e\u6d41\u82cf\u5370\u82b1\u95e8\u6bef",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "MG027",
        "name": "TABLE CARPET",
        "category": "Accessories",
        "price": 35.0,
        "is_published": true,
        "brand": "MOBI GARDEN"
    },
    {
        "sku": "MG028",
        "name": "STRING LIGHT USB",
        "category": "Lighting & Lamp",
        "price": 35.0,
        "is_published": true,
        "brand": "MOBI GARDEN"
    },
    {
        "sku": "MG030",
        "name": "ENAMEL SUSPENSION POT 5L",
        "category": "Cookware & Tableware",
        "price": 99.0,
        "is_published": true,
        "brand": "MOBI GARDEN"
    },
    {
        "sku": "MG031",
        "name": "Star wishing ground lamp (2 pack)",
        "category": "Lighting & Lamp",
        "price": 99.0,
        "is_published": true,
        "brand": "MOBI GARDEN"
    },
    {
        "sku": "MG032",
        "name": "Xingguo Retro Camp Lamp L1",
        "category": "Lighting & Lamp",
        "price": 99.0,
        "is_published": true,
        "brand": "MOBI GARDEN"
    },
    {
        "sku": "MG032#",
        "name": "CAMPING LANTERN L1\n\u661f\u679c\u590d\u53e4\u8425\u706fL1",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "MG033",
        "name": "XF ORTABLE FAN F3",
        "category": "Accessories",
        "price": 99.0,
        "is_published": true,
        "brand": "MOBI GARDEN"
    },
    {
        "sku": "MG038",
        "name": "XIAOFENG PORTABLE FAN F2",
        "category": "Accessories",
        "price": 99.0,
        "is_published": true,
        "brand": "MOBI GARDEN"
    },
    {
        "sku": "MG039",
        "name": "PICNIC BASKET (INSULATION)",
        "category": "Storage / Bucket / Bag",
        "price": 99.0,
        "is_published": true,
        "brand": "MOBI GARDEN"
    },
    {
        "sku": "MG040",
        "name": "PICNIC BASKET",
        "category": "Storage / Bucket / Bag",
        "price": 99.0,
        "is_published": true,
        "brand": "MOBI GARDEN"
    },
    {
        "sku": "MG042",
        "name": "TISSUE BOX FOR ROLL PAPER",
        "category": "Accessories",
        "price": 99.0,
        "is_published": true,
        "brand": "MOBI GARDEN"
    },
    {
        "sku": "MG043",
        "name": "TISSUE BOX",
        "category": "Accessories",
        "price": 99.0,
        "is_published": true,
        "brand": "MOBI GARDEN"
    },
    {
        "sku": "MG044",
        "name": "TISSUE BOX (LEATHER)",
        "category": "Storage / Bucket / Bag",
        "price": 99.0,
        "is_published": true,
        "brand": "MOBI GARDEN"
    },
    {
        "sku": "MG045",
        "name": "MINI FOLDING CHAIR Black",
        "category": "Table & Chair",
        "price": 99.0,
        "is_published": true,
        "brand": "MOBI GARDEN"
    },
    {
        "sku": "MG045#",
        "name": "MINI FOLDING CHAIR\n\u8ff7\u4f60\u6298\u53e0\u6905",
        "category": "MOBI GARDEN",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "MG048",
        "name": "MINI FOLDING CHAIR Beige",
        "category": "Table & Chair",
        "price": 99.0,
        "is_published": true,
        "brand": "MOBI GARDEN"
    },
    {
        "sku": "MG049",
        "name": "MINI FOLDING CHAIR Sand",
        "category": "Table & Chair",
        "price": 99.0,
        "is_published": true,
        "brand": "MOBI GARDEN"
    },
    {
        "sku": "MG050",
        "name": "BARBECUE FOUR-PIECE SET",
        "category": "Cookware & Tableware",
        "price": 99.0,
        "is_published": true,
        "brand": "MOBI GARDEN"
    },
    {
        "sku": "MG051",
        "name": "STORAGE BAG FOR GAS STOVE",
        "category": "Storage / Bucket / Bag",
        "price": 99.0,
        "is_published": true,
        "brand": "MOBI GARDEN"
    },
    {
        "sku": "MG052",
        "name": "RY COFFEE POT Grey",
        "category": "Cookware & Tableware",
        "price": 99.0,
        "is_published": true,
        "brand": "MOBI GARDEN"
    },
    {
        "sku": "MG053",
        "name": "SY COFFEE POT Silver",
        "category": "Cookware & Tableware",
        "price": 99.0,
        "is_published": true,
        "brand": "MOBI GARDEN"
    },
    {
        "sku": "MG054",
        "name": "ENAMEL KETTLE White",
        "category": "Cookware & Tableware",
        "price": 99.0,
        "is_published": true,
        "brand": "MOBI GARDEN"
    },
    {
        "sku": "MG055",
        "name": "ENAMEL KETTLE Black",
        "category": "Cookware & Tableware",
        "price": 99.0,
        "is_published": true,
        "brand": "MOBI GARDEN"
    },
    {
        "sku": "MG056",
        "name": "ENAMEL COFFEE POT White",
        "category": "Cookware & Tableware",
        "price": 99.0,
        "is_published": true,
        "brand": "MOBI GARDEN"
    },
    {
        "sku": "MG057",
        "name": "ENAMEL COFFEE POT Black",
        "category": "Cookware & Tableware",
        "price": 99.0,
        "is_published": true,
        "brand": "MOBI GARDEN"
    },
    {
        "sku": "MG058",
        "name": "AIR PUMP 45\n\u6ca7\u6d77\u5145\u6c14\u6cf5 45",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "MG059",
        "name": "TAURUS DOUBLE AIR MATTRESS \n\u91d1\u725b\u53cc\u4eba\u6c14\u57ab",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "MG060",
        "name": "TAURUS DOUBLE AIR MATTRESS \n\u91d1\u725b\u53cc\u4eba\u6c14\u57ab",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "MG061",
        "name": "GRILL\n\u71ce\u708e\u711a\u706b\u67b6",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "MG062",
        "name": "FIREWOOD STAND\n\u6781\u5149\u67f4\u706b\u67b6",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "MG063",
        "name": "ADAPTER\n\u6241\u6c14\u7f50\u8f6c\u63a5\u5934",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "MG064",
        "name": "JG HOOK S\n\u6781\u70ac\u4e09\u89d2\u7f6e\u7269\u6302\u67b6\u6302\u94a9S",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "MG065",
        "name": "JG HOOK L\n\u6781\u70ac\u4e09\u89d2\u7f6e\u7269\u6302\u67b6\u6302\u94a9L",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "MG066",
        "name": "COOLER BOX 36L\n\u6781\u51b0\u5e26\u62d6\u8f6e\u4fdd\u6e29\u7bb136L",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "MG067",
        "name": "COOLER BOX 36L\n\u6781\u51b0\u5e26\u62d6\u8f6e\u4fdd\u6e29\u7bb136L",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "MG068",
        "name": "COOLER BOX 43L\n\u51b0\u4eab43L\u51b7\u85cf\u7bb1",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "MG069",
        "name": "STRETCHABLE LIGHT STAND\n\u98ce\u96ea\u94dd\u5408\u91d1\u53ef\u4f38\u7f29\u706f\u67b6",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "MG070",
        "name": "LAMP SUPPORT\n\u4e0d\u9508\u94a2\u706f\u67b6",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "MG071",
        "name": "CUP\n\u6781\u5bb4\u6c34\u676f",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "MG072",
        "name": "LIGHT(SOLAR VERSION)-2 IN A PACK\n\u661f\u613f\u5730\u63d2\u706f\uff08\u592a\u9633\u80fd\u72482\u4e2a\u88c5\uff09",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "MG073",
        "name": "LANYARD\n\u591a\u529f\u80fd\u6302\u7ef3",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "MG074",
        "name": "LANYARD 550\n\u591a\u529f\u80fd\u6302\u7ef3550",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "MG075",
        "name": "CLOUDY FOLDING CART S2\n\u4e91\u9645\u6298\u53e0\u63a8\u8f66S2",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "MG076",
        "name": "CAMPING STORAGE BAG\uff08M\uff09\n\u591a\u529f\u80fd\u9732\u8425\u6536\u7eb3\u5305\uff08M\uff09",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "MG077",
        "name": "CAMPING STORAGE BAG\uff08L\uff09\n\u591a\u529f\u80fd\u9732\u8425\u6536\u7eb3\u5305\uff08L\uff09",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "MH001",
        "name": "Original beech butterfly chair Khaki Small",
        "category": "Table & Chair",
        "price": 115.0,
        "is_published": true,
        "brand": "MOUNTAIN HIKER"
    },
    {
        "sku": "MH002",
        "name": "Original beech butterfly chair Khaki Large",
        "category": "Table & Chair",
        "price": 139.0,
        "is_published": true,
        "brand": "MOUNTAIN HIKER"
    },
    {
        "sku": "MH003",
        "name": "Original beech butterfly chair Black Large",
        "category": "Table & Chair",
        "price": 139.0,
        "is_published": true,
        "brand": "MOUNTAIN HIKER"
    },
    {
        "sku": "MH004",
        "name": "Khaki camp cart Small",
        "category": "Accessories",
        "price": 135.0,
        "is_published": true,
        "brand": "MOUNTAIN HIKER"
    },
    {
        "sku": "MH006",
        "name": "Aluminum table",
        "category": "Accessories",
        "price": 39.0,
        "is_published": true,
        "brand": "MOUNTAIN HIKER"
    },
    {
        "sku": "MH007",
        "name": "Steel mesh table storage bag",
        "category": "Accessories",
        "price": 29.0,
        "is_published": true,
        "brand": "MOUNTAIN HIKER"
    },
    {
        "sku": "MH008",
        "name": "rubbish frame rubbish frame",
        "category": "Accessories",
        "price": 19.0,
        "is_published": true,
        "brand": "MOUNTAIN HIKER"
    },
    {
        "sku": "MH009",
        "name": "Outdoor mobile kitchen",
        "category": "Cookware & Tableware",
        "price": 339.0,
        "is_published": true,
        "brand": "MOUNTAIN HIKER"
    },
    {
        "sku": "MH009#",
        "name": "outdoor mobile kitchen",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "MOUNTAIN HIKER"
    },
    {
        "sku": "MH010",
        "name": "Tent canopy",
        "category": "Flysheet / Tarp / Canopy",
        "price": 389.0,
        "is_published": true,
        "brand": "MOUNTAIN HIKER"
    },
    {
        "sku": "MH011",
        "name": "Folding pen storage rack Small",
        "category": "Accessories",
        "price": 109.0,
        "is_published": true,
        "brand": "MOUNTAIN HIKER"
    },
    {
        "sku": "MH012",
        "name": "Folding pen storage rack Large",
        "category": "Accessories",
        "price": 139.0,
        "is_published": true,
        "brand": "MOUNTAIN HIKER"
    },
    {
        "sku": "MH013",
        "name": "Aluminum Alloy Storage Rack Frame Small",
        "category": "Accessories",
        "price": 49.99,
        "is_published": true,
        "brand": "MOUNTAIN HIKER"
    },
    {
        "sku": "MH014",
        "name": "Aluminum Alloy Storage Rack Frame Large",
        "category": "Accessories",
        "price": 62.99,
        "is_published": true,
        "brand": "MOUNTAIN HIKER"
    },
    {
        "sku": "MH015",
        "name": "Sucre Blanket White",
        "category": "Accessories",
        "price": 32.99,
        "is_published": true,
        "brand": "MOUNTAIN HIKER"
    },
    {
        "sku": "MH017",
        "name": "Aluminum Alloy Tripod Black",
        "category": "Accessories",
        "price": 29.99,
        "is_published": true,
        "brand": "MOUNTAIN HIKER"
    },
    {
        "sku": "MH018",
        "name": "Aluminum Alloy Tripod Silver",
        "category": "Accessories",
        "price": 29.99,
        "is_published": true,
        "brand": "MOUNTAIN HIKER"
    },
    {
        "sku": "MH020",
        "name": "Stainless Steel 4pcs cup set White",
        "category": "cookware / Tableware",
        "price": 37.99,
        "is_published": true,
        "brand": "MOUNTAIN HIKER"
    },
    {
        "sku": "MH021",
        "name": "Stainless Steel 4pcs cup set Black",
        "category": "cookware / Tableware",
        "price": 37.99,
        "is_published": true,
        "brand": "MOUNTAIN HIKER"
    },
    {
        "sku": "MH022",
        "name": "Mug Silver",
        "category": "cookware / Tableware",
        "price": 12.99,
        "is_published": true,
        "brand": "MOUNTAIN HIKER"
    },
    {
        "sku": "MH023",
        "name": "Mug Black",
        "category": "cookware / Tableware",
        "price": 15.99,
        "is_published": true,
        "brand": "MOUNTAIN HIKER"
    },
    {
        "sku": "MH023#",
        "name": "mug",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "MOUNTAIN HIKER"
    },
    {
        "sku": "MH026",
        "name": "Cheese Pillow",
        "category": "camp bed / Matteress",
        "price": 34.99,
        "is_published": true,
        "brand": "MOUNTAIN HIKER"
    },
    {
        "sku": "MH027",
        "name": "PE Bucket 13L",
        "category": "Storage / Bucket / Bag",
        "price": 36.99,
        "is_published": true,
        "brand": "MOUNTAIN HIKER"
    },
    {
        "sku": "MH028",
        "name": "PE Bucket 22L",
        "category": "Storage / Bucket / Bag",
        "price": 49.99,
        "is_published": true,
        "brand": "MOUNTAIN HIKER"
    },
    {
        "sku": "MH029",
        "name": "Incubator Storage Beige",
        "category": "Storage / Bucket / Bag",
        "price": 179.99,
        "is_published": true,
        "brand": "MOUNTAIN HIKER"
    },
    {
        "sku": "MH031",
        "name": "Acorn Light Black",
        "category": "Lighting / Lamp",
        "price": 139.99,
        "is_published": true,
        "brand": "MOUNTAIN HIKER"
    },
    {
        "sku": "MH032",
        "name": "Baolin Light Black",
        "category": "Lighting / Lamp",
        "price": 139.99,
        "is_published": true,
        "brand": "MOUNTAIN HIKER"
    },
    {
        "sku": "MH035",
        "name": "Fantasy Candlestick",
        "category": "Lighting / Lamp",
        "price": 40.0,
        "is_published": true,
        "brand": "MOUNTAIN HIKER"
    },
    {
        "sku": "MH036",
        "name": "Net Bag Storage Rack",
        "category": "Accessories",
        "price": 89.99,
        "is_published": true,
        "brand": "MOUNTAIN HIKER"
    },
    {
        "sku": "MH036#",
        "name": "Net bag storage rack",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "MOUNTAIN HIKER"
    },
    {
        "sku": "MH037",
        "name": "Small Round Table Wood",
        "category": "table / chair",
        "price": 99.0,
        "is_published": true,
        "brand": "MOUNTAIN HIKER"
    },
    {
        "sku": "MH039",
        "name": "Meal Kit",
        "category": "Accessories",
        "price": 37.99,
        "is_published": true,
        "brand": "MOUNTAIN HIKER"
    },
    {
        "sku": "MH040",
        "name": "Cheese Pillow Case",
        "category": "camp bed / Matteress",
        "price": 99.0,
        "is_published": true,
        "brand": "MOUNTAIN HIKER"
    },
    {
        "sku": "MH041",
        "name": "Pine Cone Chandelier Light Black",
        "category": "Lighting / Lamp",
        "price": 49.99,
        "is_published": true,
        "brand": "MOUNTAIN HIKER"
    },
    {
        "sku": "MH042",
        "name": "Pine Cone Chandelier Light Khaki",
        "category": "Lighting / Lamp",
        "price": 49.99,
        "is_published": true,
        "brand": "MOUNTAIN HIKER"
    },
    {
        "sku": "MH043",
        "name": "Pine Cone Chandelier Light White",
        "category": "Lighting / Lamp",
        "price": 49.99,
        "is_published": true,
        "brand": "MOUNTAIN HIKER"
    },
    {
        "sku": "MH044",
        "name": "1.4L Kettle",
        "category": "cookware / Tableware",
        "price": 99.0,
        "is_published": true,
        "brand": "MOUNTAIN HIKER"
    },
    {
        "sku": "MH045",
        "name": "Changenable Storage Rack Khaki",
        "category": "Accessories",
        "price": 129.99,
        "is_published": true,
        "brand": "MOUNTAIN HIKER"
    },
    {
        "sku": "MH046",
        "name": "Changenable Storage Rack Black",
        "category": "Accessories",
        "price": 129.99,
        "is_published": true,
        "brand": "MOUNTAIN HIKER"
    },
    {
        "sku": "MH047",
        "name": "7040 Lifting Net Table",
        "category": "table / chair",
        "price": 119.99,
        "is_published": true,
        "brand": "MOUNTAIN HIKER"
    },
    {
        "sku": "MH048",
        "name": "Pulled Insulated Box Storage 36L",
        "category": "Storage / Bucket / Bag",
        "price": 199.99,
        "is_published": true,
        "brand": "MOUNTAIN HIKER"
    },
    {
        "sku": "MH050",
        "name": "Quick-open camping tent medium",
        "category": "Camping Tent",
        "price": 99.0,
        "is_published": true,
        "brand": "MOUNTAIN HIKER"
    },
    {
        "sku": "MH051",
        "name": "Breatable mesh mosquito repellent",
        "category": "Flysheet / Tarp / Canopy",
        "price": 99.0,
        "is_published": true,
        "brand": "MOUNTAIN HIKER"
    },
    {
        "sku": "MH052",
        "name": "Maillard Ridge Tent",
        "category": "Camping Tent",
        "price": 99.0,
        "is_published": true,
        "brand": "MOUNTAIN HIKER"
    },
    {
        "sku": "MH053",
        "name": "Fire Spiit Stove Five Star",
        "category": "cookware / Tableware",
        "price": 99.0,
        "is_published": true,
        "brand": "MOUNTAIN HIKER"
    },
    {
        "sku": "MH053#",
        "name": "Huoling stove",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "MOUNTAIN HIKER"
    },
    {
        "sku": "MH054",
        "name": "Aluminum lunch box",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "MOUNTAIN HIKER"
    },
    {
        "sku": "MH055",
        "name": "camp bed",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "MOUNTAIN HIKER"
    },
    {
        "sku": "MH056",
        "name": "camp bed",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "MOUNTAIN HIKER"
    },
    {
        "sku": "MH057",
        "name": "Dome cloth 2 pack",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "MOUNTAIN HIKER"
    },
    {
        "sku": "MH058",
        "name": "triple storage rack",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "MOUNTAIN HIKER"
    },
    {
        "sku": "MH059",
        "name": "Pisces two-tier stroller",
        "category": "Uncategorized",
        "price": 460.0,
        "is_published": true,
        "brand": "MOUNTAIN HIKER"
    },
    {
        "sku": "MH060",
        "name": "green pot set",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "MOUNTAIN HIKER"
    },
    {
        "sku": "MH061",
        "name": "spider stove",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "MOUNTAIN HIKER"
    },
    {
        "sku": "MH062",
        "name": "Upgraded lifting bag table",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "MOUNTAIN HIKER"
    },
    {
        "sku": "NH001",
        "name": "Village6.0 2 generation Quick Open Tent",
        "category": "Camping Tent",
        "price": 940.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH001#",
        "name": "Village 6.0 \u2161 Automatic Tent",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "NH002",
        "name": "Village 13 tent for 5-8 man(with hall pole)",
        "category": "Camping Tent",
        "price": 1699.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH002#",
        "name": "Village 13 Automatic Tent",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "NH003",
        "name": "Village 13 Quick-opening tent",
        "category": "Camping Tent",
        "price": 1281.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH004",
        "name": "Extend Air 17.2 inflatable tent(camp version)",
        "category": "Camping Tent",
        "price": 6011.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH005",
        "name": "(YUNJIE) Quick open canopy -Canopy Only",
        "category": "Flysheet / Tarp / Canopy",
        "price": 549.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH006",
        "name": "(YUNJIE) Quick open canopy - Connector Only",
        "category": "Flysheet / Tarp / Canopy",
        "price": 91.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH007",
        "name": "Glacier awning canopy Q-9B with 2 poles\n(Octagon Large)",
        "category": "Flysheet / Tarp / Canopy",
        "price": 507.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH008",
        "name": "Glacier awning canopy Q-9B with 2 poles\n(Hexagon Medium)",
        "category": "Flysheet / Tarp / Canopy",
        "price": 485.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH009",
        "name": "Glacier awning canopy Q-9B with 2 poles\n(Octagon Small)",
        "category": "Flysheet / Tarp / Canopy",
        "price": 369.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH010",
        "name": "TPU double air sofa",
        "category": "Table & Chair",
        "price": 589.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH010#",
        "name": "TPU double air sofa",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "NH011",
        "name": "C10 Self-inflating sponge cushion\n(Single)",
        "category": "Camp Bed & Mattress",
        "price": 410.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH012",
        "name": "C10 Self-inflating sponge cushion\n(Double)",
        "category": "Camp Bed & Mattress",
        "price": 635.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH013",
        "name": "pvc heightened air mattress with air pump",
        "category": "Camp Bed & Mattress",
        "price": 358.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH014",
        "name": "Large stainless steel tent peg - 20cm",
        "category": "Peg & Pole",
        "price": 12.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH015",
        "name": "Large stainless steel tent peg - 25cm",
        "category": "Peg & Pole",
        "price": 14.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH016",
        "name": "Large stainless steel tent peg - 30cm",
        "category": "Peg & Pole",
        "price": 16.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH017",
        "name": "(Fangyun) Aluminum Alloy Egg Roll Table - Large - Black",
        "category": "Table & Chair",
        "price": 250.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH018",
        "name": "(Fangyun) Aluminum Alloy Egg Roll Table - Large - Wood",
        "category": "Table & Chair",
        "price": 250.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH019",
        "name": "(Fangyun) Aluminum Alloy Egg Roll Table - Medium - Wood",
        "category": "Table & Chair",
        "price": 199.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH020",
        "name": "(Fangyun) Aluminum Alloy Egg Roll Table -Small - Wood",
        "category": "Table & Chair",
        "price": 165.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH021",
        "name": "Outdoor folding moon chair - Khaki",
        "category": "Table & Chair",
        "price": 93.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH022",
        "name": "Outdoor folding moon chair - Black",
        "category": "Table & Chair",
        "price": 93.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH023",
        "name": "Recliner Chair with Table",
        "category": "Table & Chair",
        "price": 125.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH024",
        "name": "YL11 Outdoor Folding Rocking Chair",
        "category": "Table & Chair",
        "price": 399.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH024#",
        "name": "YL11 Outdoor Folding Rocking Chair",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "NH025",
        "name": "MW02 outdoor folding chair - Black Large",
        "category": "Table & Chair",
        "price": 179.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH026",
        "name": "MW02 outdoor folding chair - Walnut Large",
        "category": "Table & Chair",
        "price": 179.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH027",
        "name": "MW02 outdoor folding chair - Khaki Large",
        "category": "Table & Chair",
        "price": 179.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH028",
        "name": "XJC04 Ultralight foldable camping cot Q-9E - Black",
        "category": "Camp Bed & Mattress",
        "price": 359.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH029",
        "name": "XJC04 Ultralight foldable camping cot Q-9E - Khaki",
        "category": "Camp Bed & Mattress",
        "price": 359.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH030",
        "name": "(light) folding trolley Khaki",
        "category": "Accessories",
        "price": 229.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH031",
        "name": "tabletop for (light) folding trolley",
        "category": "Accessories",
        "price": 159.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH032",
        "name": "TC03 four-way folding trolley",
        "category": "Accessories",
        "price": 349.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH033",
        "name": "Mosquito Repellent Camping Lamp",
        "category": "Lighting & Lamp",
        "price": 199.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH034",
        "name": "Outdoor tabletop Shelf",
        "category": "Accessories",
        "price": 41.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH035",
        "name": "Aluminum Alloy Camping Pot set - Kettle Set",
        "category": "Cookware & Tableware",
        "price": 229.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH035#",
        "name": "Aluminum Alloy Camping Pot set",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "NH036",
        "name": "Aluminum Alloy Camping Pot set - Pot set",
        "category": "Cookware & Tableware",
        "price": 211.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH037",
        "name": "(moyan)Tabletop Travel BBQ Grill",
        "category": "Cookware & Tableware",
        "price": 149.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH038",
        "name": "Multifunctional Cassette Stove",
        "category": "Cookware & Tableware",
        "price": 265.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH039",
        "name": "Mini Cassette Stove - Green",
        "category": "Cookware & Tableware",
        "price": 135.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH040",
        "name": "Mini Cassette Stove - Khaki",
        "category": "Cookware & Tableware",
        "price": 125.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH041",
        "name": "(Ling Yue S) PP folding storage box",
        "category": "Accessories",
        "price": 62.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH042",
        "name": "PP folding storage box - Grey 50L",
        "category": "Accessories",
        "price": 129.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH043",
        "name": "PP folding storage box - Green 50L",
        "category": "Accessories",
        "price": 112.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH046",
        "name": "U series envelope sleeping bag with hood U150",
        "category": "Camp Bed & Mattress",
        "price": 79.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH046#",
        "name": "U series envelope sleeping bag with hood U150",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "NATUREHIKE"
    },
    {
        "sku": "NH047",
        "name": "U series envelope sleeping bag with hood U250",
        "category": "Camp Bed & Mattress",
        "price": 99.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH048",
        "name": "Cloud Boundar Quick Opening Canopy - Ground Mat",
        "category": "Flysheet / Tarp / Canopy",
        "price": 99.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH049",
        "name": "Village Suite Quick Open Tent",
        "category": "Camping Tent",
        "price": 2699.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH050",
        "name": "Village 13 Quick-opening tent (Upgrade Version)",
        "category": "Camping Tent",
        "price": 1399.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH051",
        "name": "Village 17 tent (with hall pole)",
        "category": "Camping Tent",
        "price": 1950.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH052",
        "name": "Cloud Boundar Quick Opening Canopy (Expand Canopy)",
        "category": "Flysheet / Tarp / Canopy",
        "price": 190.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH053",
        "name": "Cloud Boundar Quick Opening Canopy (Door Curtain)",
        "category": "Flysheet / Tarp / Canopy",
        "price": 115.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH054",
        "name": "(Flagstar)-Triangle Camp Felt Flag",
        "category": "Accessories",
        "price": 39.9,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH055",
        "name": "Canvas hanging flag (Sheild-shape)",
        "category": "Accessories",
        "price": 14.99,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH056",
        "name": "Canvas hanging flag (Triangle-shaped)",
        "category": "Accessories",
        "price": 14.99,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH057",
        "name": "Decoration pennant (orange & khaki)",
        "category": "Accessories",
        "price": 93.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH058",
        "name": "infinite spell three-proof jacquard tablecloth",
        "category": "Accessories",
        "price": 92.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH059",
        "name": "Geometric pattern wool blanket Khaki",
        "category": "Accessories",
        "price": 99.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH060",
        "name": "Geometric pattern wool blanket Dark coffee",
        "category": "Accessories",
        "price": 99.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH061",
        "name": "Memory Foam Comfort Square Pillow",
        "category": "Camp Bed & Mattress",
        "price": 99.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH061#",
        "name": "Memory Foam Comfort Square Pillow",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "NH062",
        "name": "3D Comfortable Silent Foam Pillow",
        "category": "Camp Bed & Mattress",
        "price": 99.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH063",
        "name": "IGT barbecue table",
        "category": "Cookware & Tableware",
        "price": 99.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH063#",
        "name": "IGT barbecue table",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "NH064",
        "name": "Fangzhe IGT Two-unit table",
        "category": "Cookware & Tableware",
        "price": 99.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH064#",
        "name": "Fangzhe IGT Two-unit table",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "NH065",
        "name": "IGT quick opening folding table",
        "category": "Cookware & Tableware",
        "price": 99.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH066",
        "name": "Tabletop for TC03 folding trolley",
        "category": "Accessories",
        "price": 180.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH067",
        "name": "(Mountain Pavilion) camping light White",
        "category": "Lighting / Lamp",
        "price": 99.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH068",
        "name": "(Mountain Pavilion) camping light Army Green",
        "category": "Lighting / Lamp",
        "price": 99.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH069",
        "name": "Sunset camping light",
        "category": "Lighting / Lamp",
        "price": 99.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH070",
        "name": "Atmosphere lamp string",
        "category": "Lighting / Lamp",
        "price": 99.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH070#",
        "name": "Atmosphere lamp string",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "NH071",
        "name": "(star point) ambient string lights",
        "category": "Lighting / Lamp",
        "price": 99.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH071#",
        "name": "(star point) ambient string lights",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "NH072",
        "name": "(Shiwei) portable seasoning bottle set 6 in 1",
        "category": "Cookware & Tableware",
        "price": 99.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH072#",
        "name": "(Shiwei) portable seasoning bottle set",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "NH073",
        "name": "(Shiwei) portable seasoning bottle set 8 in 1",
        "category": "Cookware & Tableware",
        "price": 99.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH073#",
        "name": "(Shiwei) portable seasoning bottle set",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "NH074",
        "name": "(Ling Yue S) PP folding storage box - 50L Moonlight",
        "category": "Storage / Bucket / Bag",
        "price": 99.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH074#",
        "name": "(Ling Yue S) PP folding storage box",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "NH075",
        "name": "(Ling Yue S) PP folding storage box - 50L+10L - Moonlight",
        "category": "Storage / Bucket / Bag",
        "price": 79.99,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH075#",
        "name": "(Ling Yue S) PP folding storage box",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "NH076",
        "name": "Outdoor PE water bucket Khaki 20L",
        "category": "Storage / Bucket / Bag",
        "price": 99.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH076#",
        "name": "Outdoor PE water bucket",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "NH077",
        "name": "Outdoor PE water bucket Khaki 12L",
        "category": "Storage / Bucket / Bag",
        "price": 99.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH078",
        "name": "(Lingdu 24H) 13L Outdoor antibacterial cooler box",
        "category": "Storage / Bucket / Bag",
        "price": 59.99,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH079",
        "name": "(Lingdu 24H) 24L Outdoor antibacterial cooler box",
        "category": "Storage / Bucket / Bag",
        "price": 99.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH079#",
        "name": "(Lingdu 24H) Outdoor antibacterial cooler box",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "NH081",
        "name": "(Lingdu 36H) 22L Outdoor antibacterial cooler box",
        "category": "Storage / Bucket / Bag",
        "price": 99.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH082",
        "name": "XS01 Toiletry Bag Black",
        "category": "Storage / Bucket / Bag",
        "price": 99.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH083",
        "name": "XS01 Toiletry Bag Khaki",
        "category": "Storage / Bucket / Bag",
        "price": 99.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH084",
        "name": "T05J recliner chair with table KHAKI",
        "category": "table / chair",
        "price": 99.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH084#",
        "name": "Nightfall T05J Recliner with table",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "NH085",
        "name": "T05J recliner chair with table BLACK",
        "category": "table / chair",
        "price": 99.0,
        "is_published": true,
        "brand": "NATURE HIKE"
    },
    {
        "sku": "NH085#",
        "name": "Nightfall T05J Recliner with table",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "NH086",
        "name": "Village 6.0 \u2161 Automatic Tent",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "NH087",
        "name": "Village 13 Automatic Tent",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "NH088",
        "name": "Cloud Skies Tarp (Aluminum pole)",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "NH089",
        "name": "Cloud Boundar Quick  Opening Canopy",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "NH090",
        "name": "Double sleeping bag pattern with pillow",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "NH091",
        "name": "Double sleeping bag pattern with pillow",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "NH092",
        "name": "Happy Ultrasonic picnic mat & suitable for village 6.0 tent(6976023920189)",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "NH093",
        "name": "Happy Ultrasonic picnic mat & suitable for village 13 tent(6927595753668)",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "NH094",
        "name": "Memory Foam Comfort Square Pillow",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "NH095",
        "name": "(light) folding trolley",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "NH096",
        "name": "Outdoor Mosquito Killer Lamp",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "NH097",
        "name": "Outdoor Mosquito Killer Lamp",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "NH098",
        "name": "Vertical BBQ grill",
        "category": "Uncategorized",
        "price": 239.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "NH099",
        "name": "Vertical BBQ grill",
        "category": "Uncategorized",
        "price": 239.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "NH100",
        "name": "Dark star three burners gas stove",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "NH101",
        "name": "Outdoor PE water bucket",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "NH102",
        "name": "Sea star 001 push-up high back cotton-filled moon chair",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "NH103",
        "name": "Sea star 001 push-up high back cotton-filled moon chair",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "NH104",
        "name": "(moyan)Tabletop Travel BBQ Grill",
        "category": "Uncategorized",
        "price": 180.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "NH105",
        "name": "Gen Air 12 Cotton Inflatable Tent",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "OP001",
        "name": "F951 OPOLAR Clip Fan",
        "category": "Accessories",
        "price": 99.0,
        "is_published": true,
        "brand": "OPOLAR"
    },
    {
        "sku": "OP002",
        "name": "F954 OPOLAR Clip Fan",
        "category": "Accessories",
        "price": 99.0,
        "is_published": true,
        "brand": "OPOLAR"
    },
    {
        "sku": "OP003",
        "name": "F2901 OPOLAR Clip Fan",
        "category": "Accessories",
        "price": 130.0,
        "is_published": true,
        "brand": "OPOLAR"
    },
    {
        "sku": "OP004",
        "name": "WH310 OPOLAR Clip Fan",
        "category": "Accessories",
        "price": 120.0,
        "is_published": true,
        "brand": "OPOLAR"
    },
    {
        "sku": "OP005",
        "name": "AIR102 OPOLAR Clip Fan",
        "category": "Accessories",
        "price": 145.0,
        "is_published": true,
        "brand": "OPOLAR"
    },
    {
        "sku": "OP006",
        "name": "WH81 OPOLAR Camping Clip With Hanging Hook",
        "category": "Accessories",
        "price": 155.0,
        "is_published": true,
        "brand": "OPOLAR"
    },
    {
        "sku": "OP007",
        "name": "NF08 OPOLAR Waist/Hand Held",
        "category": "Accessories",
        "price": 89.0,
        "is_published": true,
        "brand": "OPOLAR"
    },
    {
        "sku": "OP008",
        "name": "NF181 OPOLAR Waist/Hand Held",
        "category": "Accessories",
        "price": 105.0,
        "is_published": true,
        "brand": "OPOLAR"
    },
    {
        "sku": "OP009",
        "name": "F2610 OPOLAR Waist/Hand Held",
        "category": "Accessories",
        "price": 130.0,
        "is_published": true,
        "brand": "OPOLAR"
    },
    {
        "sku": "OP010",
        "name": "WH71 OPOLAR Stand/Tower (Floor Fan)",
        "category": "Accessories",
        "price": 160.0,
        "is_published": true,
        "brand": "OPOLAR"
    },
    {
        "sku": "OP011",
        "name": "WH91 OPOLAR Stand/Tower (Floor Fan)",
        "category": "Accessories",
        "price": 269.0,
        "is_published": true,
        "brand": "OPOLAR"
    },
    {
        "sku": "OP012",
        "name": "AIR201 OPOLAR Stand/Tower (Floor Fan)",
        "category": "Accessories",
        "price": 160.0,
        "is_published": true,
        "brand": "OPOLAR"
    },
    {
        "sku": "OP013",
        "name": "F1501 OPOLAR Desk Fan",
        "category": "Accessories",
        "price": 65.0,
        "is_published": true,
        "brand": "OPOLAR"
    },
    {
        "sku": "OP014",
        "name": "F681 OPOLAR Desk Fan",
        "category": "Accessories",
        "price": 220.0,
        "is_published": true,
        "brand": "OPOLAR"
    },
    {
        "sku": "OP015",
        "name": "O7X OPOLAR Desk Fan",
        "category": "Accessories",
        "price": 135.0,
        "is_published": true,
        "brand": "OPOLAR"
    },
    {
        "sku": "OP016",
        "name": "NF171 OPOLAR Neck Fan",
        "category": "Accessories",
        "price": 119.0,
        "is_published": true,
        "brand": "OPOLAR"
    },
    {
        "sku": "OP017",
        "name": "OPOLAR Battery Cover",
        "category": "Storage / Buckets / Bag",
        "price": 3.9,
        "is_published": true,
        "brand": "OPOLAR"
    },
    {
        "sku": "OP018",
        "name": "OPOLAR S Bag",
        "category": "Storage / Buckets / Bag",
        "price": 59.0,
        "is_published": true,
        "brand": "OPOLAR"
    },
    {
        "sku": "OP019",
        "name": "OPOLAR M Bag",
        "category": "Storage / Buckets / Bag",
        "price": 69.0,
        "is_published": true,
        "brand": "OPOLAR"
    },
    {
        "sku": "OP020",
        "name": "OPOLAR T Bag black",
        "category": "Storage / Buckets / Bag",
        "price": 85.0,
        "is_published": true,
        "brand": "OPOLAR"
    },
    {
        "sku": "OP021",
        "name": "OPOLAR T Bag Grey",
        "category": "Storage / Buckets / Bag",
        "price": 85.0,
        "is_published": true,
        "brand": "OPOLAR"
    },
    {
        "sku": "ST001",
        "name": "ST-05 series medium coffee box bottom table",
        "category": "Cookware & Tableware",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST002",
        "name": "ST-05 series large coffee box bottom table",
        "category": "Cookware & Tableware",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST003",
        "name": "Medium coffee box set (including aluminum box)",
        "category": "Cookware & Tableware",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST004",
        "name": "Large coffee box set (including aluminum box)",
        "category": "Cookware & Tableware",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST005",
        "name": "ST-05 series lightweight tactical table-Zhu Muhei",
        "category": "Cookware & Tableware",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST006",
        "name": "ST-05 Series Dome Canopy-Zhu Dui Black-Glass Fiber Rod",
        "category": "Flysheet / Tarp / Canopy",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST006#",
        "name": "#05 Series Dome Skylight-Fiberglass Rod BLACK",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST007",
        "name": "ST-05 Series Dome Canopy-Zhu Mu Black-Aluminum Alloy Pole",
        "category": "Flysheet / Tarp / Canopy",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST008",
        "name": "ST-05 series dome curtain cloth 2-piece pack - Zhumuhei",
        "category": "Flysheet / Tarp / Canopy",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST008#",
        "name": "#05 Series Dome Canopy Zipper Sidewalls (Set of 2) BLACK",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST009",
        "name": "ST-05 Series Dome Canopy Fence 2-piece Pack - Zhumuhei",
        "category": "Flysheet / Tarp / Canopy",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST009#",
        "name": "#05 Series Dome Canopy Zipper Mesh Sidewalls (Set of 2) BLACK",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST010",
        "name": "ST-05 Series Moon Chair-Zhu Muhei",
        "category": "table / chair",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST010#",
        "name": "#05 Series moon chair",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST011",
        "name": "ST-05 Series Kermit Chair-Zhu Muhei",
        "category": "table / chair",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST012",
        "name": "ST-05 series nut lamp-Zhu Muhei",
        "category": "Lighting / Lamp",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST012#",
        "name": "#05 Series Nut Light",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST013",
        "name": "ST-05 Series Nut Lamp-War Eagle Sand",
        "category": "Lighting / Lamp",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST014",
        "name": "ST-05 series retro small chandelier-Zhu Muhei",
        "category": "Lighting / Lamp",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST014#",
        "name": "#05 Series Retro small chandelier",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST015",
        "name": "ST-05 series retro small chandelier-War Eagle Sand",
        "category": "Lighting / Lamp",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST015#",
        "name": "#05 Series Retro small chandelier",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST016",
        "name": "ST-05 Series Tactical Camping Cup-Zhu Muhei",
        "category": "Cookware & Tableware",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST017",
        "name": "ST-05 Series Tactical Camping Cup-Burn to Ashes",
        "category": "Cookware & Tableware",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST018",
        "name": "ST-05 Series Tactical Camping Cup - Micro Smoke Ash",
        "category": "Cookware & Tableware",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST019",
        "name": "05 series tactical aluminum box black medium size",
        "category": "Storage / Buckets / Bag",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST020",
        "name": "05 series tactical aluminum box black large size",
        "category": "Storage / Buckets / Bag",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST021",
        "name": "05 Tactical Aluminum Box Black Medium-Leading Model",
        "category": "Storage / Buckets / Bag",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST022",
        "name": "05 Tactical Aluminum Box Black Large-Leading Model",
        "category": "Storage / Buckets / Bag",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST023",
        "name": "ST-05 series igt side panel water filter rack",
        "category": "Storage / Buckets / Bag",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST024",
        "name": "ST-05 series IGT one unit side panel",
        "category": "Storage / Buckets / Bag",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST025",
        "name": "ST-05 series IGT half unit laminate",
        "category": "Storage / Buckets / Bag",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST026",
        "name": "ST-05 series medium coffee box table top",
        "category": "Storage / Buckets / Bag",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST027",
        "name": "ST-05 series large coffee box IGT frame",
        "category": "Storage / Buckets / Bag",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST028",
        "name": "ST-05 series large coffee box mesh",
        "category": "Storage / Buckets / Bag",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST029",
        "name": "ST-05 series medium coffee box mesh",
        "category": "Storage / Buckets / Bag",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST030",
        "name": "ST-05 series module light stand",
        "category": "Storage / Buckets / Bag",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST031",
        "name": "05 Series Black Mist IGT Camping Table",
        "category": "Cookware & Tableware",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST032",
        "name": "05 Series Black Mist IGT Camping Table Side Stand (2 Pack)",
        "category": "Cookware & Tableware",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST033",
        "name": "05 series black mist IGT camping table shelf set",
        "category": "Cookware & Tableware",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST034",
        "name": "05 Series Black Mist IGT Camping Table Shelf Set",
        "category": "Cookware & Tableware",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST035",
        "name": "05 Series Black Mist IGT Camping Table + Side Stand",
        "category": "Cookware & Tableware",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST036",
        "name": "05 Series Black Mist IGT Camping Table + Shelf",
        "category": "Cookware & Tableware",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST037",
        "name": "ST-Black Mist IGT Camping Table Storage Bag",
        "category": "Storage / Buckets / Bag",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST038",
        "name": "All black quick table combination package (small)",
        "category": "Table & Chair",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST039",
        "name": "All black quick table combination package (medium)",
        "category": "Table & Chair",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST040",
        "name": "All black quick table combination package (large)",
        "category": "Table & Chair",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST041",
        "name": "Storage rack triangular bag (small)",
        "category": "Accessories",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST043",
        "name": "Tripod + foldable storage shelf",
        "category": "Accessories",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST044",
        "name": "Tripod + table set",
        "category": "Accessories",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST045",
        "name": "ST-Biquan drinking water bag 8 liters Black",
        "category": "Storage / Buckets / Bag",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST046",
        "name": "ST-Biquan drinking water bag 8 liters Khaki",
        "category": "Storage / Buckets / Bag",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST047",
        "name": "Fun drink cup set Silver",
        "category": "Cookware & Tableware",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST048",
        "name": "Fun drink cup set Black",
        "category": "Cookware & Tableware",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST049",
        "name": "Enjoy stainless steel water cup set Silver",
        "category": "Cookware & Tableware",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST051",
        "name": "Enjoy stainless steel water cup set Beige",
        "category": "Cookware & Tableware",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST052",
        "name": "ST-drinking source camping bucket 10L Green",
        "category": "Storage / Buckets / Bag",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST053",
        "name": "ST-drinking source camping bucket 10L Black",
        "category": "Storage / Buckets / Bag",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST054",
        "name": "ST-drinking source camping bucket 10L Khaki",
        "category": "Storage / Buckets / Bag",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST055",
        "name": "ST-Yi Drink Camping Bucket 15L Black",
        "category": "Storage / Buckets / Bag",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST056",
        "name": "ST-Yi Drink Camping Bucket 15L Green",
        "category": "Storage / Buckets / Bag",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST057",
        "name": "ST-Yi Drink Camping Bucket 15L Khaki",
        "category": "Storage / Buckets / Bag",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST058",
        "name": "ST-Seasoning Bottle Storage Bag-Black",
        "category": "Storage / Buckets / Bag",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST059",
        "name": "ST-Seasoning Bottle Set-Black",
        "category": "Cookware & Tableware",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST059#",
        "name": "6 IN 1 BOTTLE SET",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST060",
        "name": "Changchui camping windshield black-set",
        "category": "Accessories",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST061",
        "name": "ST-Changchui camping windshield-black",
        "category": "Accessories",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST062",
        "name": "Flat IGT unit table-ordinary model",
        "category": "Cookware & Tableware",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST063",
        "name": "Spider web IGT unit table board",
        "category": "Cookware & Tableware",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST064",
        "name": "Capsule IGT unit table-ordinary model",
        "category": "Cookware & Tableware",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST065",
        "name": "Starry Sky IGT Unit Table-Ordinary Model",
        "category": "Cookware & Tableware",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST066",
        "name": "ST-Spider Furnace IGT Board-Spider",
        "category": "Cookware & Tableware",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST067",
        "name": "ST-Spider Furnace IGT Board-Starry Sky",
        "category": "Cookware & Tableware",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST068",
        "name": "ST-One unit IGT drain basket-silver",
        "category": "Cookware & Tableware",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST073",
        "name": "#05 Series Automatic Dome Canopy BLACK",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST074",
        "name": "#05 Series Automatic Dome Canopy GREEN",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST075",
        "name": "#05 Series Automatic Dome Canopy Zipper Sidewalls (Set of 2) BLACK",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST076",
        "name": "#05 Series Automatic Dome Canopy Zipper Sidewalls (Set of 2",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST077",
        "name": "#05 Series Automatic Dome Canopy Zipper Mesh Sidewalls (Set of 2) BLACK",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST078",
        "name": "#05 Series Automatic Dome Canopy Mat BLACK",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST079",
        "name": "#05 Series Dome Skylight-Fiberglass Rod GREEN",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST080",
        "name": "Dome Canopy Zipper Sidewall",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST081",
        "name": "#05 Series Dome Canopy Zipper Mesh Sidewalls (Set of 2) GREEN",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST082",
        "name": "#05 Series moon chair",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST083",
        "name": "#05 Series Wind rope warning light",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST084",
        "name": "#05 Series Nut Light",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST085",
        "name": "Retro Small Chandilier",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST086",
        "name": "Lightning helmets - Set",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST087",
        "name": "#05 Series Velcro straps Set",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST088",
        "name": "#05 Series Velcro straps Set",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST089",
        "name": "#05 Series Velcro straps Set",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "ST090",
        "name": "#05 Series Velcro straps Set",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "SHINE TRIP"
    },
    {
        "sku": "TD001",
        "name": "TODAK Foldable Chair Nova",
        "category": "Merchaindise",
        "price": 249.0,
        "is_published": true,
        "brand": "TODAK CULTURE"
    },
    {
        "sku": "TD002",
        "name": "TODAK Foldable Chair Nova Mini",
        "category": "Merchaindise",
        "price": 199.0,
        "is_published": true,
        "brand": "TODAK CULTURE"
    },
    {
        "sku": "TD003",
        "name": "Todak Bucket Hat (W)",
        "category": "Merchaindise",
        "price": 99.0,
        "is_published": true,
        "brand": "TODAK CULTURE"
    },
    {
        "sku": "TD004",
        "name": "Todak Oversized Bag",
        "category": "Merchaindise",
        "price": 159.0,
        "is_published": true,
        "brand": "TODAK CULTURE"
    },
    {
        "sku": "TD005",
        "name": "Todak Camp Hat",
        "category": "Merchaindise",
        "price": 99.0,
        "is_published": true,
        "brand": "TODAK CULTURE"
    },
    {
        "sku": "TD006",
        "name": "Todak Camo 5 Panel Cap",
        "category": "Merchaindise",
        "price": 99.0,
        "is_published": true,
        "brand": "TODAK CULTURE"
    },
    {
        "sku": "TD007",
        "name": "Umbrella",
        "category": "Merchaindise",
        "price": 10.0,
        "is_published": true,
        "brand": "TODAK CULTURE"
    },
    {
        "sku": "TD008",
        "name": "Todak X KClique Bandana (B)",
        "category": "Merchaindise",
        "price": 5.0,
        "is_published": true,
        "brand": "TODAK CULTURE"
    },
    {
        "sku": "TD009",
        "name": "Todak X KClique Bandana (G)",
        "category": "Merchaindise",
        "price": 15.9,
        "is_published": true,
        "brand": "TODAK CULTURE"
    },
    {
        "sku": "TD010",
        "name": "Todak Lanyard | Celestial Blue",
        "category": "Merchaindise",
        "price": 15.9,
        "is_published": true,
        "brand": "TODAK CULTURE"
    },
    {
        "sku": "TD011",
        "name": "Todak Lanyard  | Graffiti",
        "category": "Merchaindise",
        "price": 15.9,
        "is_published": true,
        "brand": "TODAK CULTURE"
    },
    {
        "sku": "TD012",
        "name": "Todak Lanyard  | Ocean",
        "category": "Merchaindise",
        "price": 15.9,
        "is_published": true,
        "brand": "TODAK CULTURE"
    },
    {
        "sku": "TD013",
        "name": "Todak Conquer The Depth | Gelora Edition | S",
        "category": "Merchaindise",
        "price": 15.9,
        "is_published": true,
        "brand": "TODAK CULTURE"
    },
    {
        "sku": "TD014",
        "name": "Todak Conquer The Depth | Gelora Edition | M",
        "category": "Merchaindise",
        "price": 15.9,
        "is_published": true,
        "brand": "TODAK CULTURE"
    },
    {
        "sku": "TD015",
        "name": "Todak Conquer The Depth | Gelora Edition | L",
        "category": "Merchaindise",
        "price": 15.9,
        "is_published": true,
        "brand": "TODAK CULTURE"
    },
    {
        "sku": "TD016",
        "name": "Todak Conquer The Depth | Metafor Edition | S",
        "category": "Merchaindise",
        "price": 15.9,
        "is_published": true,
        "brand": "TODAK CULTURE"
    },
    {
        "sku": "TD017",
        "name": "Todak Conquer The Depth | Metafor Edition | M",
        "category": "Merchaindise",
        "price": 15.9,
        "is_published": true,
        "brand": "TODAK CULTURE"
    },
    {
        "sku": "TD018",
        "name": "Todak Conquer The Depth | Metafor Edition | L",
        "category": "Merchaindise",
        "price": 15.9,
        "is_published": true,
        "brand": "TODAK CULTURE"
    },
    {
        "sku": "TD019",
        "name": "Todak Conquer The Depth | Desiran Edition | S",
        "category": "Merchaindise",
        "price": 15.9,
        "is_published": true,
        "brand": "TODAK CULTURE"
    },
    {
        "sku": "TD020",
        "name": "Todak Conquer The Depth | Desiran Edition | M",
        "category": "Merchaindise",
        "price": 15.9,
        "is_published": true,
        "brand": "TODAK CULTURE"
    },
    {
        "sku": "TD021",
        "name": "Todak Conquer The Depth | Desiran Edition | L",
        "category": "Merchaindise",
        "price": 15.9,
        "is_published": true,
        "brand": "TODAK CULTURE"
    },
    {
        "sku": "VD001",
        "name": "VIDALIDO Vicore - Black",
        "category": "Camping Tent",
        "price": 1899.0,
        "is_published": true,
        "brand": "VIDALIDO"
    },
    {
        "sku": "VD001#",
        "name": "VIDALIDO Vicore L",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "VD002",
        "name": "VIDALIDO Vicore - White",
        "category": "Camping Tent",
        "price": 1899.0,
        "is_published": true,
        "brand": "VIDALIDO"
    },
    {
        "sku": "VD003",
        "name": "VIDALIDO Poon Saan - Black",
        "category": "Camping Tent",
        "price": 612.0,
        "is_published": true,
        "brand": "VIDALIDO"
    },
    {
        "sku": "VD003#",
        "name": "VIDALIDO Poon Saan M",
        "category": "Uncategorized",
        "price": 661.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "VD004",
        "name": "VIDALIDO Poon Saan - Khaki",
        "category": "Camping Tent",
        "price": 612.0,
        "is_published": true,
        "brand": "VIDALIDO"
    },
    {
        "sku": "VD004#",
        "name": "VIDALIDO Poon Saan M",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "VD005",
        "name": "VIDALIDO Flower Lantern Charging Model - White",
        "category": "Lighting & Lamp",
        "price": 109.0,
        "is_published": true,
        "brand": "VIDALIDO"
    },
    {
        "sku": "VD006",
        "name": "VIDALIDO Flower Lantern Charging Model - Khaki",
        "category": "Lighting & Lamp",
        "price": 109.0,
        "is_published": true,
        "brand": "VIDALIDO"
    },
    {
        "sku": "VD007",
        "name": "VIDALIDO Flower Lantern Charging Model - Army Green",
        "category": "Lighting & Lamp",
        "price": 109.0,
        "is_published": true,
        "brand": "VIDALIDO"
    },
    {
        "sku": "VD008",
        "name": "VIDALIDO 1.8M*19MM iron pole",
        "category": "Peg & Pole",
        "price": 50.0,
        "is_published": true,
        "brand": "VIDALIDO"
    },
    {
        "sku": "VD009",
        "name": "VIDALIDO 2.2M*19MM iron pole",
        "category": "Peg & Pole",
        "price": 67.0,
        "is_published": true,
        "brand": "VIDALIDO"
    },
    {
        "sku": "VD010",
        "name": "VIDALIDO 2.4M*25MM iron pole",
        "category": "Peg & Pole",
        "price": 75.0,
        "is_published": true,
        "brand": "VIDALIDO"
    },
    {
        "sku": "VD011",
        "name": "VIDALIDO 2.8M*25MM iron pole",
        "category": "Peg & Pole",
        "price": 91.0,
        "is_published": true,
        "brand": "VIDALIDO"
    },
    {
        "sku": "VD012",
        "name": "VIDALIDO 1.8M*22MM aluminum pole",
        "category": "Peg & Pole",
        "price": 99.0,
        "is_published": true,
        "brand": "VIDALIDO"
    },
    {
        "sku": "VD013",
        "name": "VIDALIDO 2.2M*22MM aluminum pole -  Black",
        "category": "Peg & Pole",
        "price": 150.0,
        "is_published": true,
        "brand": "VIDALIDO"
    },
    {
        "sku": "VD014",
        "name": "VIDALIDO 2.2M*22MM aluminum pole - Silver",
        "category": "Peg & Pole",
        "price": 150.0,
        "is_published": true,
        "brand": "VIDALIDO"
    },
    {
        "sku": "VD015",
        "name": "VIDALIDO 2.4M*28MM aluminum pole",
        "category": "Peg & Pole",
        "price": 169.0,
        "is_published": true,
        "brand": "VIDALIDO"
    },
    {
        "sku": "VD016",
        "name": "VIDALIDO 2.8M*28MM aluminum pole",
        "category": "Peg & Pole",
        "price": 201.0,
        "is_published": true,
        "brand": "VIDALIDO"
    },
    {
        "sku": "VD017",
        "name": "VIDALIDO 2.4M*28MM carbon fibre pole",
        "category": "Peg & Pole",
        "price": 581.0,
        "is_published": true,
        "brand": "VIDALIDO"
    },
    {
        "sku": "VD018",
        "name": "VIDALIDO Folding light pole bracket",
        "category": "Accessories",
        "price": 72.0,
        "is_published": true,
        "brand": "VIDALIDO"
    },
    {
        "sku": "VD020",
        "name": "VIDALIDO Small villa tent PE floor mat",
        "category": "Camping Tent",
        "price": 99.0,
        "is_published": true,
        "brand": "VIDALIDO"
    },
    {
        "sku": "VD021",
        "name": "Black and white diamond plaid blanket 180*130cm",
        "category": "Accessories",
        "price": 99.0,
        "is_published": true,
        "brand": "VIDALIDO"
    },
    {
        "sku": "VD022",
        "name": "Black and white diamond plaid blanket 180*230cm",
        "category": "Accessories",
        "price": 99.0,
        "is_published": true,
        "brand": "VIDALIDO"
    },
    {
        "sku": "VD023",
        "name": "Colored diamond-plaid blanket 180*130cm",
        "category": "Accessories",
        "price": 99.0,
        "is_published": true,
        "brand": "VIDALIDO"
    },
    {
        "sku": "VD024",
        "name": "Colored diamond-plaid blanket 180*230cm",
        "category": "Accessories",
        "price": 99.0,
        "is_published": true,
        "brand": "VIDALIDO"
    },
    {
        "sku": "VD025",
        "name": "Camp pennant",
        "category": "Accessories",
        "price": 99.0,
        "is_published": true,
        "brand": "VIDALIDO"
    },
    {
        "sku": "VD026",
        "name": "Camp pennant",
        "category": "Accessories",
        "price": 99.0,
        "is_published": true,
        "brand": "VIDALIDO"
    },
    {
        "sku": "VD027",
        "name": "Felt pennant",
        "category": "Accessories",
        "price": 99.0,
        "is_published": true,
        "brand": "VIDALIDO"
    },
    {
        "sku": "VD028",
        "name": "The flag is hung in cotton triangle.",
        "category": "Accessories",
        "price": 99.0,
        "is_published": true,
        "brand": "VIDALIDO"
    },
    {
        "sku": "VD029",
        "name": "Triangle flag small (four pieces)",
        "category": "Accessories",
        "price": 99.0,
        "is_published": true,
        "brand": "VIDALIDO"
    },
    {
        "sku": "VD030",
        "name": "Triangle flag large (four pieces)",
        "category": "Accessories",
        "price": 99.0,
        "is_published": true,
        "brand": "VIDALIDO"
    },
    {
        "sku": "VD031",
        "name": "VIDALIDO Automatic Teepee Pro",
        "category": "VIDALIDO",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "VD032",
        "name": "VIDALIDO Vicore S",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "VD033",
        "name": "VIDALIDO Poon Saan L",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "VD034",
        "name": "VIDALIDO Poon Saan L",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "VD035",
        "name": "VIDALIDO Floating Plus Tarp",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "VD036",
        "name": "VIDALIDO Floating Plus Tarp",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "VD037",
        "name": "VIDALIDO Poon Saan Pro",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "VD038",
        "name": "VIDALIDO Daybreak L",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "VD039",
        "name": "VIDALIDO Tarp 5*5.8 2 Iron",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "VD040",
        "name": "VIDALIDO Moon Chair High Back",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "VD041",
        "name": "VIDALIDO Moon Chair High Back",
        "category": "Uncategorized",
        "price": 99.0,
        "is_published": true,
        "brand": "10camp"
    },
    {
        "sku": "PC001",
        "name": "Groundsheet 2.6*2.6",
        "category": "Groundsheet",
        "price": 75.0,
        "is_published": true,
        "brand": "PAYUNG CAMP"
    },
    {
        "sku": "PC002",
        "name": "Groundsheet 3*3",
        "category": "Groundsheet",
        "price": 85.0,
        "is_published": true,
        "brand": "PAYUNG CAMP"
    },
    {
        "sku": "PC003",
        "name": "Groundsheet 3.4*2.4",
        "category": "Groundsheet",
        "price": 85.0,
        "is_published": true,
        "brand": "PAYUNG CAMP"
    },
    {
        "sku": "PC004",
        "name": "Groundsheet 3.2*2.4",
        "category": "Groundsheet",
        "price": 99.0,
        "is_published": true,
        "brand": "PAYUNG CAMP"
    },
    {
        "sku": "PC005",
        "name": "Groundsheet 4.0*2.8",
        "category": "Groundsheet",
        "price": 99.0,
        "is_published": true,
        "brand": "PAYUNG CAMP"
    }
];
let inventoryBatches = [
    {
        "id": 1,
        "sku": "BD001",
        "qty_remaining": 3,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 2,
        "sku": "BD002",
        "qty_remaining": 2,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 3,
        "sku": "BD003",
        "qty_remaining": 2,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 4,
        "sku": "BD004",
        "qty_remaining": 2,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 5,
        "sku": "BD005",
        "qty_remaining": 31,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 6,
        "sku": "BD006",
        "qty_remaining": 40,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 7,
        "sku": "BD007",
        "qty_remaining": 30,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 8,
        "sku": "BD008",
        "qty_remaining": 30,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 9,
        "sku": "BD009",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 10,
        "sku": "BD010",
        "qty_remaining": 8,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 11,
        "sku": "BD011",
        "qty_remaining": 14,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 12,
        "sku": "BD012",
        "qty_remaining": 15,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 13,
        "sku": "BD013",
        "qty_remaining": 11,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 14,
        "sku": "BD014",
        "qty_remaining": 6,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 15,
        "sku": "BD015",
        "qty_remaining": 6,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 16,
        "sku": "BD016",
        "qty_remaining": 6,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 17,
        "sku": "BD019",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 18,
        "sku": "BD020",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 19,
        "sku": "BD021",
        "qty_remaining": 6,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 20,
        "sku": "BD022",
        "qty_remaining": 6,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 21,
        "sku": "BD023",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 22,
        "sku": "BD024",
        "qty_remaining": 18,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 23,
        "sku": "BD025",
        "qty_remaining": 50,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 24,
        "sku": "BD026",
        "qty_remaining": 50,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 25,
        "sku": "BD027",
        "qty_remaining": 6,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 26,
        "sku": "BD028",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 27,
        "sku": "BD032",
        "qty_remaining": 6,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 28,
        "sku": "BD033",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 29,
        "sku": "BD034",
        "qty_remaining": 6,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 30,
        "sku": "BD035",
        "qty_remaining": 6,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 31,
        "sku": "BD036",
        "qty_remaining": 12,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 32,
        "sku": "BD037",
        "qty_remaining": 12,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 33,
        "sku": "BD038",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 34,
        "sku": "BD039",
        "qty_remaining": 6,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 35,
        "sku": "BD040",
        "qty_remaining": 11,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 36,
        "sku": "BD041",
        "qty_remaining": 11,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 37,
        "sku": "BD042",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 38,
        "sku": "BD043",
        "qty_remaining": 12,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 39,
        "sku": "BD045",
        "qty_remaining": 6,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 40,
        "sku": "BD046",
        "qty_remaining": 6,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 41,
        "sku": "BD047",
        "qty_remaining": 12,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 42,
        "sku": "BD048",
        "qty_remaining": 12,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 43,
        "sku": "BD049",
        "qty_remaining": 11,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 44,
        "sku": "BD050",
        "qty_remaining": 12,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 45,
        "sku": "BD051",
        "qty_remaining": 24,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 46,
        "sku": "BD052",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 47,
        "sku": "BD053",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 48,
        "sku": "BD054",
        "qty_remaining": 40,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 49,
        "sku": "BD055",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 50,
        "sku": "BD056",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 51,
        "sku": "BD057",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 52,
        "sku": "BD058",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 53,
        "sku": "BD059",
        "qty_remaining": 5,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 54,
        "sku": "BD060",
        "qty_remaining": 8,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 55,
        "sku": "BD061",
        "qty_remaining": 25,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 56,
        "sku": "BD062",
        "qty_remaining": 6,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 57,
        "sku": "CD001",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 58,
        "sku": "CD002",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 59,
        "sku": "CD003",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 60,
        "sku": "CD004",
        "qty_remaining": 24,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 61,
        "sku": "CD005",
        "qty_remaining": 18,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 62,
        "sku": "CD006",
        "qty_remaining": 12,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 63,
        "sku": "CD007",
        "qty_remaining": 24,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 64,
        "sku": "CD008",
        "qty_remaining": 24,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 65,
        "sku": "CD009",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 66,
        "sku": "CD010",
        "qty_remaining": 24,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 67,
        "sku": "CD011",
        "qty_remaining": 100,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 68,
        "sku": "CD012",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 69,
        "sku": "CD013",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 70,
        "sku": "CD014",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 71,
        "sku": "CD015",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 72,
        "sku": "CD016",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 73,
        "sku": "CD017",
        "qty_remaining": 30,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 74,
        "sku": "CD018",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 75,
        "sku": "CD019",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 76,
        "sku": "CD020",
        "qty_remaining": 21,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 77,
        "sku": "CD021",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 78,
        "sku": "CD022",
        "qty_remaining": 21,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 79,
        "sku": "CD023",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 80,
        "sku": "CD024",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 81,
        "sku": "CD025",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 82,
        "sku": "CD026",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 83,
        "sku": "CD027",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 84,
        "sku": "CD028",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 85,
        "sku": "CD029",
        "qty_remaining": 12,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 86,
        "sku": "CD030",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 87,
        "sku": "CD031",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 88,
        "sku": "CD032",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 89,
        "sku": "CD033",
        "qty_remaining": 25,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 90,
        "sku": "CD034",
        "qty_remaining": 25,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 91,
        "sku": "CD035",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 92,
        "sku": "CD036",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 93,
        "sku": "CD037",
        "qty_remaining": 18,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 94,
        "sku": "CD038",
        "qty_remaining": 30,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 95,
        "sku": "CD039",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 96,
        "sku": "CD040",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 97,
        "sku": "CD041",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 98,
        "sku": "CD042",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 99,
        "sku": "CD043",
        "qty_remaining": 5,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 100,
        "sku": "CD044",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 101,
        "sku": "CD045",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 102,
        "sku": "CD046",
        "qty_remaining": 5,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 103,
        "sku": "LF001",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 104,
        "sku": "LF003",
        "qty_remaining": 12,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 105,
        "sku": "LF005",
        "qty_remaining": 12,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 106,
        "sku": "LF010",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 107,
        "sku": "LF018",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 108,
        "sku": "LF020",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 109,
        "sku": "LF022",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 110,
        "sku": "LF025",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 111,
        "sku": "LF026",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 112,
        "sku": "LF027",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 113,
        "sku": "LF028",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 114,
        "sku": "LF029",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 115,
        "sku": "MG001",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 116,
        "sku": "MG002",
        "qty_remaining": 30,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 117,
        "sku": "MG003",
        "qty_remaining": 30,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 118,
        "sku": "MG004",
        "qty_remaining": 7,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 119,
        "sku": "MG005",
        "qty_remaining": 12,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 120,
        "sku": "MG006",
        "qty_remaining": 8,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 121,
        "sku": "MG007",
        "qty_remaining": 14,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 122,
        "sku": "MG008",
        "qty_remaining": 4,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 123,
        "sku": "MG009",
        "qty_remaining": 22,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 124,
        "sku": "MG010",
        "qty_remaining": 44,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 125,
        "sku": "MG011",
        "qty_remaining": 44,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 126,
        "sku": "MG012",
        "qty_remaining": 44,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 127,
        "sku": "MG013",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 128,
        "sku": "MG014",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 129,
        "sku": "MG015",
        "qty_remaining": 15,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 130,
        "sku": "MG016",
        "qty_remaining": 15,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 131,
        "sku": "MG017",
        "qty_remaining": 15,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 132,
        "sku": "MG018",
        "qty_remaining": 50,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 133,
        "sku": "MG019",
        "qty_remaining": 5,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 134,
        "sku": "MG020",
        "qty_remaining": 5,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 135,
        "sku": "MG021",
        "qty_remaining": 5,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 136,
        "sku": "MG022",
        "qty_remaining": 15,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 137,
        "sku": "MG023",
        "qty_remaining": 15,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 138,
        "sku": "MG024",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 139,
        "sku": "MG025",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 140,
        "sku": "MG027",
        "qty_remaining": 90,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 141,
        "sku": "MG028",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 142,
        "sku": "MG030",
        "qty_remaining": 8,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 143,
        "sku": "MG031",
        "qty_remaining": 9,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 144,
        "sku": "MG032",
        "qty_remaining": 25,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 145,
        "sku": "MG033",
        "qty_remaining": 16,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 146,
        "sku": "MG038",
        "qty_remaining": 12,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 147,
        "sku": "MG039",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 148,
        "sku": "MG040",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 149,
        "sku": "MG042",
        "qty_remaining": 50,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 150,
        "sku": "MG043",
        "qty_remaining": 50,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 151,
        "sku": "MG044",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 152,
        "sku": "MG045",
        "qty_remaining": 8,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 153,
        "sku": "MG048",
        "qty_remaining": 8,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 154,
        "sku": "MG049",
        "qty_remaining": 8,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 155,
        "sku": "MG050",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 156,
        "sku": "MG051",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 157,
        "sku": "MG052",
        "qty_remaining": 12,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 158,
        "sku": "MG053",
        "qty_remaining": 12,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 159,
        "sku": "MG054",
        "qty_remaining": 8,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 160,
        "sku": "MG055",
        "qty_remaining": 8,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 161,
        "sku": "MG056",
        "qty_remaining": 8,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 162,
        "sku": "MG057",
        "qty_remaining": 8,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 163,
        "sku": "MH001",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 164,
        "sku": "MH002",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 165,
        "sku": "MH003",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 166,
        "sku": "MH004",
        "qty_remaining": 8,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 167,
        "sku": "MH006",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 168,
        "sku": "MH007",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 169,
        "sku": "MH008",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 170,
        "sku": "MH009",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 171,
        "sku": "MH010",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 172,
        "sku": "MH011",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 173,
        "sku": "MH012",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 174,
        "sku": "MH013",
        "qty_remaining": 25,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 175,
        "sku": "MH014",
        "qty_remaining": 25,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 176,
        "sku": "MH015",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 177,
        "sku": "MH017",
        "qty_remaining": 5,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 178,
        "sku": "MH018",
        "qty_remaining": 5,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 179,
        "sku": "MH020",
        "qty_remaining": 40,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 180,
        "sku": "MH021",
        "qty_remaining": 40,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 181,
        "sku": "MH022",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 182,
        "sku": "MH023",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 183,
        "sku": "MH026",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 184,
        "sku": "MH027",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 185,
        "sku": "MH028",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 186,
        "sku": "MH029",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 187,
        "sku": "MH031",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 188,
        "sku": "MH032",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 189,
        "sku": "MH035",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 190,
        "sku": "MH036",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 191,
        "sku": "MH037",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 192,
        "sku": "MH039",
        "qty_remaining": 50,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 193,
        "sku": "MH040",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 194,
        "sku": "MH041",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 195,
        "sku": "MH042",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 196,
        "sku": "MH043",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 197,
        "sku": "MH044",
        "qty_remaining": 30,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 198,
        "sku": "MH045",
        "qty_remaining": 5,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 199,
        "sku": "MH046",
        "qty_remaining": 5,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 200,
        "sku": "MH047",
        "qty_remaining": 5,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 201,
        "sku": "MH048",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 202,
        "sku": "MH050",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 203,
        "sku": "MH051",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 204,
        "sku": "MH052",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 205,
        "sku": "MH053",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 206,
        "sku": "NH001",
        "qty_remaining": 13,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 207,
        "sku": "NH002",
        "qty_remaining": 12,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 208,
        "sku": "NH003",
        "qty_remaining": 12,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 209,
        "sku": "NH004",
        "qty_remaining": 5,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 210,
        "sku": "NH005",
        "qty_remaining": 18,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 211,
        "sku": "NH006",
        "qty_remaining": 17,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 212,
        "sku": "NH007",
        "qty_remaining": 4,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 213,
        "sku": "NH008",
        "qty_remaining": 2,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 214,
        "sku": "NH009",
        "qty_remaining": 16,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 215,
        "sku": "NH010",
        "qty_remaining": 6,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 216,
        "sku": "NH011",
        "qty_remaining": 8,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 217,
        "sku": "NH012",
        "qty_remaining": 8,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 218,
        "sku": "NH013",
        "qty_remaining": 5,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 219,
        "sku": "NH014",
        "qty_remaining": 40,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 220,
        "sku": "NH015",
        "qty_remaining": 40,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 221,
        "sku": "NH016",
        "qty_remaining": 40,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 222,
        "sku": "NH017",
        "qty_remaining": 15,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 223,
        "sku": "NH018",
        "qty_remaining": 15,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 224,
        "sku": "NH019",
        "qty_remaining": 15,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 225,
        "sku": "NH020",
        "qty_remaining": 15,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 226,
        "sku": "NH021",
        "qty_remaining": 29,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 227,
        "sku": "NH022",
        "qty_remaining": 29,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 228,
        "sku": "NH023",
        "qty_remaining": 2,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 229,
        "sku": "NH024",
        "qty_remaining": 3,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 230,
        "sku": "NH025",
        "qty_remaining": 16,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 231,
        "sku": "NH026",
        "qty_remaining": 16,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 232,
        "sku": "NH027",
        "qty_remaining": 16,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 233,
        "sku": "NH028",
        "qty_remaining": 8,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 234,
        "sku": "NH029",
        "qty_remaining": 6,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 235,
        "sku": "NH030",
        "qty_remaining": 12,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 236,
        "sku": "NH031",
        "qty_remaining": 11,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 237,
        "sku": "NH032",
        "qty_remaining": 7,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 238,
        "sku": "NH033",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 239,
        "sku": "NH034",
        "qty_remaining": 22,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 240,
        "sku": "NH035",
        "qty_remaining": 12,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 241,
        "sku": "NH036",
        "qty_remaining": 12,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 242,
        "sku": "NH037",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 243,
        "sku": "NH038",
        "qty_remaining": 8,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 244,
        "sku": "NH039",
        "qty_remaining": 12,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 245,
        "sku": "NH040",
        "qty_remaining": 12,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 246,
        "sku": "NH041",
        "qty_remaining": 30,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 247,
        "sku": "NH042",
        "qty_remaining": 19,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 248,
        "sku": "NH043",
        "qty_remaining": 5,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 249,
        "sku": "NH046",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 250,
        "sku": "NH047",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 251,
        "sku": "NH048",
        "qty_remaining": 40,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 252,
        "sku": "NH049",
        "qty_remaining": 4,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 253,
        "sku": "NH050",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 254,
        "sku": "NH051",
        "qty_remaining": 4,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 255,
        "sku": "NH052",
        "qty_remaining": 12,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 256,
        "sku": "NH053",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 257,
        "sku": "NH054",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 258,
        "sku": "NH055",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 259,
        "sku": "NH056",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 260,
        "sku": "NH057",
        "qty_remaining": 15,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 261,
        "sku": "NH058",
        "qty_remaining": 30,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 262,
        "sku": "NH059",
        "qty_remaining": 9,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 263,
        "sku": "NH060",
        "qty_remaining": 9,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 264,
        "sku": "NH061",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 265,
        "sku": "NH062",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 266,
        "sku": "NH063",
        "qty_remaining": 6,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 267,
        "sku": "NH064",
        "qty_remaining": 6,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 268,
        "sku": "NH065",
        "qty_remaining": 6,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 269,
        "sku": "NH066",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 270,
        "sku": "NH067",
        "qty_remaining": 12,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 271,
        "sku": "NH068",
        "qty_remaining": 12,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 272,
        "sku": "NH069",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 273,
        "sku": "NH070",
        "qty_remaining": 11,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 274,
        "sku": "NH071",
        "qty_remaining": 11,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 275,
        "sku": "NH072",
        "qty_remaining": 11,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 276,
        "sku": "NH073",
        "qty_remaining": 11,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 277,
        "sku": "NH074",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 278,
        "sku": "NH075",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 279,
        "sku": "NH076",
        "qty_remaining": 6,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 280,
        "sku": "NH077",
        "qty_remaining": 6,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 281,
        "sku": "NH078",
        "qty_remaining": 6,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 282,
        "sku": "NH079",
        "qty_remaining": 6,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 283,
        "sku": "NH081",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 284,
        "sku": "NH082",
        "qty_remaining": 25,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 285,
        "sku": "NH083",
        "qty_remaining": 25,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 286,
        "sku": "NH084",
        "qty_remaining": 4,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 287,
        "sku": "NH085",
        "qty_remaining": 4,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 288,
        "sku": "OP001",
        "qty_remaining": 6,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 289,
        "sku": "OP002",
        "qty_remaining": 6,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 290,
        "sku": "OP003",
        "qty_remaining": 6,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 291,
        "sku": "OP004",
        "qty_remaining": 6,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 292,
        "sku": "OP005",
        "qty_remaining": 6,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 293,
        "sku": "OP006",
        "qty_remaining": 12,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 294,
        "sku": "OP007",
        "qty_remaining": 6,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 295,
        "sku": "OP008",
        "qty_remaining": 6,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 296,
        "sku": "OP009",
        "qty_remaining": 6,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 297,
        "sku": "OP010",
        "qty_remaining": 12,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 298,
        "sku": "OP011",
        "qty_remaining": 12,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 299,
        "sku": "OP012",
        "qty_remaining": 12,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 300,
        "sku": "OP013",
        "qty_remaining": 11,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 301,
        "sku": "OP014",
        "qty_remaining": 6,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 302,
        "sku": "OP015",
        "qty_remaining": 11,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 303,
        "sku": "OP016",
        "qty_remaining": 6,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 304,
        "sku": "OP017",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 305,
        "sku": "OP018",
        "qty_remaining": 11,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 306,
        "sku": "OP019",
        "qty_remaining": 11,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 307,
        "sku": "OP020",
        "qty_remaining": 8,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 308,
        "sku": "OP021",
        "qty_remaining": 8,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 309,
        "sku": "ST001",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 310,
        "sku": "ST002",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 311,
        "sku": "ST003",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 312,
        "sku": "ST004",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 313,
        "sku": "ST005",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 314,
        "sku": "ST006",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 315,
        "sku": "ST007",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 316,
        "sku": "ST008",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 317,
        "sku": "ST009",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 318,
        "sku": "ST010",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 319,
        "sku": "ST011",
        "qty_remaining": 5,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 320,
        "sku": "ST012",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 321,
        "sku": "ST013",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 322,
        "sku": "ST014",
        "qty_remaining": 30,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 323,
        "sku": "ST015",
        "qty_remaining": 30,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 324,
        "sku": "ST016",
        "qty_remaining": 30,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 325,
        "sku": "ST017",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 326,
        "sku": "ST018",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 327,
        "sku": "ST019",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 328,
        "sku": "ST020",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 329,
        "sku": "ST021",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 330,
        "sku": "ST022",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 331,
        "sku": "ST023",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 332,
        "sku": "ST024",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 333,
        "sku": "ST025",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 334,
        "sku": "ST026",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 335,
        "sku": "ST027",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 336,
        "sku": "ST028",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 337,
        "sku": "ST029",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 338,
        "sku": "ST030",
        "qty_remaining": 25,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 339,
        "sku": "ST031",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 340,
        "sku": "ST032",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 341,
        "sku": "ST033",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 342,
        "sku": "ST034",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 343,
        "sku": "ST035",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 344,
        "sku": "ST036",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 345,
        "sku": "ST037",
        "qty_remaining": 15,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 346,
        "sku": "ST038",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 347,
        "sku": "ST039",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 348,
        "sku": "ST040",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 349,
        "sku": "ST041",
        "qty_remaining": 50,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 350,
        "sku": "ST043",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 351,
        "sku": "ST044",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 352,
        "sku": "ST045",
        "qty_remaining": 25,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 353,
        "sku": "ST046",
        "qty_remaining": 25,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 354,
        "sku": "ST047",
        "qty_remaining": 12,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 355,
        "sku": "ST048",
        "qty_remaining": 12,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 356,
        "sku": "ST049",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 357,
        "sku": "ST051",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 358,
        "sku": "ST052",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 359,
        "sku": "ST053",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 360,
        "sku": "ST054",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 361,
        "sku": "ST055",
        "qty_remaining": 6,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 362,
        "sku": "ST056",
        "qty_remaining": 6,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 363,
        "sku": "ST057",
        "qty_remaining": 6,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 364,
        "sku": "ST058",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 365,
        "sku": "ST059",
        "qty_remaining": 24,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 366,
        "sku": "ST060",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 367,
        "sku": "ST061",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 368,
        "sku": "ST062",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 369,
        "sku": "ST063",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 370,
        "sku": "ST064",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 371,
        "sku": "ST065",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 372,
        "sku": "ST066",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 373,
        "sku": "ST067",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 374,
        "sku": "ST068",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 375,
        "sku": "TD001",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 376,
        "sku": "TD002",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 377,
        "sku": "TD003",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 378,
        "sku": "TD004",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 379,
        "sku": "TD005",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 380,
        "sku": "TD006",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 381,
        "sku": "TD007",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 382,
        "sku": "TD008",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 383,
        "sku": "TD009",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 384,
        "sku": "VD001",
        "qty_remaining": 11,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 385,
        "sku": "VD002",
        "qty_remaining": 11,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 386,
        "sku": "VD003",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 387,
        "sku": "VD004",
        "qty_remaining": 12,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 388,
        "sku": "VD005",
        "qty_remaining": 30,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 389,
        "sku": "VD006",
        "qty_remaining": 30,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 390,
        "sku": "VD007",
        "qty_remaining": 30,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 391,
        "sku": "VD008",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 392,
        "sku": "VD009",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 393,
        "sku": "VD010",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 394,
        "sku": "VD011",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 395,
        "sku": "VD012",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 396,
        "sku": "VD013",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 397,
        "sku": "VD014",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 398,
        "sku": "VD015",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 399,
        "sku": "VD016",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 400,
        "sku": "VD017",
        "qty_remaining": 20,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 401,
        "sku": "VD018",
        "qty_remaining": 30,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 402,
        "sku": "VD020",
        "qty_remaining": 18,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 403,
        "sku": "VD021",
        "qty_remaining": 15,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 404,
        "sku": "VD022",
        "qty_remaining": 15,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 405,
        "sku": "VD023",
        "qty_remaining": 15,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 406,
        "sku": "VD024",
        "qty_remaining": 15,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 407,
        "sku": "VD025",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 408,
        "sku": "VD026",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 409,
        "sku": "VD027",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 410,
        "sku": "VD028",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 411,
        "sku": "VD029",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    },
    {
        "id": 412,
        "sku": "VD030",
        "qty_remaining": 10,
        "inbound_date": "2024-01-01"
    }
];
let salesHistory = [];
let customersData = [];
let cart = [];
let salesChartInst = null; // Chart.js Object

// ===================================
// INIT & NAVIGATION
// ===================================
function toggleSidebar() {
    document.getElementById("appSidebar").classList.toggle("open");
    document.getElementById("sidebarOverlay").classList.toggle("active");
}
window.toggleSidebar = toggleSidebar;

function switchTab(tabName, title) {
    document.querySelectorAll('.tab-section').forEach(s => s.style.display = 'none');
    document.getElementById(tabName + 'Section').style.display = 'block';
    document.getElementById('pageTitle').textContent = title;
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
        if(item.dataset.tab === tabName) item.classList.add('active');
    });
    const sidebar = document.getElementById("appSidebar");
    if(sidebar.classList.contains("open")) toggleSidebar();

    // Re-render chart if going to home
    if(tabName === 'home') renderDashboard();
}
window.switchTab = switchTab;

window.toggleInvForm = function(formId) {
    const f1 = document.getElementById("newSkuForm");
    const f2 = document.getElementById("inboundForm");
    const f3 = document.getElementById("csvForm");
    if(formId === 'newSkuForm') { f1.style.display = 'block'; f2.style.display = 'none'; f3.style.display = 'none';}
    if(formId === 'inboundForm') { f2.style.display = 'block'; f1.style.display = 'none'; f3.style.display = 'none';}
    if(formId === 'csvForm') { f3.style.display = 'block'; f1.style.display = 'none'; f2.style.display = 'none';}
    if(!formId) { f1.style.display = 'none'; f2.style.display = 'none'; f3.style.display = 'none'; }
}

async function initApp() {
    try {
        console.log("Loading Cloud Omnichannel Data...");
        // Temporarily Disabled to allow 600+ items dummy injection test
        // let { data: master } = await db.from('products_master').select('*');
        // if(master) masterProducts = master;

        // let { data: batches } = await db.from('inventory_batches').select('*').order('inbound_date', {ascending: true});
        // if(batches) inventoryBatches = batches;

        // RENDER FRONTEND INSTANTLY BEFORE ADMIN BACKEND FETCHES
        renderPublicStorefront();
        renderPOS();

        let { data: sales } = await db.from('sales_history').select('*').order('created_at', {ascending: false});
        if(sales) salesHistory = sales;

        let { data: custs } = await db.from('customers').select('*');
        if(custs) customersData = custs;
        renderWMS();
        renderHistory();
        renderCustomers();
        renderPromotions();
        renderDashboard();
    } catch(e) {
        alert("Server Error: " + e.message);
    }
}

// ===================================
// ANALYTICS DASHBOARD (FASA 4)
// ===================================
window.renderDashboard = function() {
    const startStr = document.getElementById('dashStartDate').value;
    const endStr = document.getElementById('dashEndDate').value;
    
    // 1. Array Filtering by Date
    let filteredSales = salesHistory;
    if(startStr && endStr) {
        const dStart = new Date(startStr);  
        dStart.setHours(0,0,0,0);
        const dEnd = new Date(endStr);      
        dEnd.setHours(23,59,59,999);
        
        filteredSales = salesHistory.filter(s => {
            const sd = new Date(s.created_at);
            return sd >= dStart && sd <= dEnd;
        });
    }

    // 2. Compute Core Metrics
    let totalSales = 0;
    let channelFreq = {};
    let itemCounts = {};

    let statusToFulfil = 0; let statusUnpaid = 0; let statusProcessing = 0; let statusReturn = 0;

    filteredSales.forEach(sale => {
        totalSales += Number(sale.total);
        
        // Channels
        let ch = sale.channel || 'In-Store';
        channelFreq[ch] = (channelFreq[ch] || 0) + Number(sale.total);

        // Status
        let st = sale.status || 'Completed';
        if(st === 'To Fulfil') statusToFulfil++;
        if(st === 'Unpaid') statusUnpaid++;
        if(st === 'Processing') statusProcessing++;
        if(st === 'Return Request') statusReturn++;

        // Best Sellers parsing
        const itemsList = typeof sale.items === 'string' ? JSON.parse(sale.items) : sale.items;
        if(Array.isArray(itemsList)) {
            itemsList.forEach(item => {
                let sKey = item.sku;
                if(!itemCounts[sKey]) itemCounts[sKey] = { name: item.name, qty: 0, revenue: 0 };
                itemCounts[sKey].qty += Number(item.quantity);
                itemCounts[sKey].revenue += (Number(item.price) * Number(item.quantity));
            });
        }
    });

    document.getElementById("dashTotalSales").textContent = totalSales.toFixed(2);
    document.getElementById("dashTotalOrders").textContent = filteredSales.length;

    // Top Channel logic
    let tChannel = "None"; let tVal = -1;
    for (let k in channelFreq) { if(channelFreq[k] > tVal) { tChannel = k; tVal = channelFreq[k]; } }
    document.getElementById("dashTopChannel").textContent = tChannel;

    // Status Board Update
    document.getElementById("badgeToFulfil").textContent = statusToFulfil;
    document.getElementById("badgeUnpaid").textContent = statusUnpaid;
    document.getElementById("badgeProcessing").textContent = statusProcessing;
    document.getElementById("badgeReturn").textContent = statusReturn;

    // 3. Inventory Stock Health
    let activeP=0; let draftP=0; let oosP=0; let lowP=0;
    masterProducts.forEach(p => {
        if(p.is_published === false) { draftP++; return; }
        activeP++;
        
        let qty = inventoryBatches.filter(b=>b.sku===p.sku).reduce((sum, b)=>sum+b.qty_remaining,0);
        if(qty === 0) oosP++;
        else if(qty < 5) lowP++;
    });
    
    document.getElementById("badgeActive").textContent = activeP;
    document.getElementById("badgeDraft").textContent = draftP;
    document.getElementById("badgeOos").textContent = oosP;
    document.getElementById("badgeLow").textContent = lowP;

    // 4. CRM Customer Metrics
    // Calculate new buyers based on how many unique names are in filteredSales vs customersData. 
    // Simplified for MVP:
    let repeatC = customersData.filter(c => c.points > 0).length; // Assumption: points means repeated
    let membersC = customersData.filter(c => c.is_member === true).length;
    document.getElementById("dashNewBuyers").textContent = customersData.length; // Total saved unique customers
    document.getElementById("badgeRepeat").textContent = repeatC;
    document.getElementById("badgeMembers").textContent = membersC;

    // 5. Draw Top 10 List
    const topArr = Object.values(itemCounts).sort((a,b) => b.qty - a.qty).slice(0, 10);
    const tbodyLines = document.getElementById("topSellingList");
    tbodyLines.innerHTML = "";
    if(topArr.length === 0) tbodyLines.innerHTML = "<tr><td>No sales data</td></tr>";
    
    topArr.forEach((o, i) => {
        tbodyLines.innerHTML += `<tr>
            <td style="width:20px; font-weight:bold; color:#888;">#${i+1}</td>
            <td><strong>${o.name}</strong></td>
            <td style="color:#000000; font-weight:bold;">${o.qty} Sold</td>
            <td style="text-align:right;">RM${o.revenue.toFixed(2)}</td>
        </tr>`;
    });

    // 6. Draw Chart.js (Daily Sales)
    let dailyMap = {};
    filteredSales.forEach(s => {
        let dStr = new Date(s.created_at).toLocaleDateString('en-GB'); 
        dailyMap[dStr] = (dailyMap[dStr] || 0) + Number(s.total);
    });
    // Sort chronological
    let sortedDates = Object.keys(dailyMap).sort((a,b)=> new Date(a.split('/').reverse().join('-')) - new Date(b.split('/').reverse().join('-')));
    let gLabels = sortedDates;
    let gData = sortedDates.map(d => dailyMap[d]);

    const ctx = document.getElementById('salesChart');
    if(!ctx) return;
    
    if(salesChartInst) salesChartInst.destroy();
    salesChartInst = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: gLabels,
            datasets: [{
                label: 'Gross Sales (RM)',
                data: gData,
                backgroundColor: 'rgba(0, 0, 0, 0.1)',
                borderColor: '#000000',
                borderWidth: 2,
                fill: true,
                tension: 0.3,
                pointRadius: 4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}

function renderHistory() {
    const el = document.getElementById("salesHistory");
    if(!el) return;
    el.innerHTML = "";
    salesHistory.forEach(sale => {
        let sc = sale.channel || 'In-Store';
        let st = sale.status || 'Completed';
        let stColor = st==='Completed'?'#000000': (st==='Unpaid'?'#6F6F6F': (st==='To Fulfil'?'#F37021':'#D80000'));

        const d = new Date(sale.created_at);
        el.innerHTML += `
            <div class="history-card">
                <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                    <strong>[#${sale.id}] RM ${sale.total.toFixed(2)}</strong>
                    <span class="badge-status" style="background:${stColor};">${st}</span>
                </div>
                <div style="font-size:13px; color:#666; margin-bottom:5px;">Buyer: ${sale.customer_name||'Walk-in'} • Channel: <strong>${sc}</strong> • ${sale.payment_method}</div>
                <div style="font-size:12px; color:#aaa;">${d.toLocaleDateString() + ' ' + d.toLocaleTimeString()}</div>
            </div>
        `;
    });
}

// ===================================
// INVENTORY WMS (BACKOFFICE)
// ===================================
function renderWMS() {
    const select = document.getElementById("inboundSkuSelect");
    if(select){
        select.innerHTML = '<option value="">-- Choose SKU --</option>';
        masterProducts.forEach(p => { select.innerHTML += `<option value="${p.sku}">[${p.sku}] ${p.name}</option>`; });
    }

    const tbody = document.getElementById("inventoryTableBody");
    if(!tbody) return;
    tbody.innerHTML = "";

    let htmlBuf3 = "";

    masterProducts.forEach(p => {
        const myBatches = inventoryBatches.filter(b => b.sku === p.sku && b.qty_remaining > 0);
        const totalStock = myBatches.reduce((sum, b) => sum + b.qty_remaining, 0);
        
        let thumb = "https://placehold.co/100x100?text=Img";
        let imgs = p.images || []; if(imgs.length > 0) thumb = imgs[0];

        let sBadge = p.is_published ? `<span style="color:green;font-size:10px;">Active</span>` : `<span style="color:red;font-size:10px;">Draft</span>`;

        htmlBuf3 += `
            <tr>
                <td>
                    <img src="${thumb}"><br>
                    ${sBadge}
                </td>
                <td>
                    <span class="sku-badge">${p.sku}</span> <span class="cat-badge">${p.category||'Uncategorized'}</span><br>
                    <strong>${p.name}</strong><br>
                    <small style="color:#888;">${p.parent_sku ? 'Variant: '+p.parent_sku : 'Main Product'}</small>
                </td>
                <td>
                    <small>Dim: ${p.length_cm||0}x${p.width_cm||0}x${p.height_cm||0}cm</small><br>
                    <small>Comm: ${p.commission_rate||0}%</small>
                </td>
                <td style="font-weight:bold; color:${totalStock <= 0 ? 'red' : 'green'};">
                    ${totalStock} ${p.unit}<br>
                    <small style="font-weight:normal; color:#888;">${myBatches.length} batch(es)</small>
                </td>
                <td>
                    <small>Cost: RM${parseFloat(p.cost_price||0).toFixed(2)}</small><br>
                    <strong>Sell: RM${parseFloat(p.price).toFixed(2)}</strong>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = htmlBuf3;
}

document.getElementById("saveMasterBtn").onclick = async function() {
    const btn = this;
    const sku = document.getElementById("newSkuCode").value.trim().toUpperCase();
    const name = document.getElementById("newSkuName").value.trim();
    const price = document.getElementById("newSkuPrice").value;
    const cost = document.getElementById("newCostPrice").value;
    const category = document.getElementById("newCategory").value.trim();
    const pub = document.getElementById("newSkuPublished").value === "true";
    
    if(!sku || !name || !price || !cost || !category) { alert("Sila isikan ruangan Wajib!"); return; }
    btn.textContent = "Uploading Images (Sabar)..."; btn.disabled = true;

    const files = document.getElementById("productImages").files;
    let uploadedUrls = [];
    for(let i=0; i<files.length; i++) {
        const file = files[i];
        const fileName = `${sku}-${Date.now()}-${i}.${file.name.split('.').pop()}`;
        const { error } = await db.storage.from('product-images').upload(fileName, file);
        if(!error) {
            const { data } = db.storage.from('product-images').getPublicUrl(fileName);
            uploadedUrls.push(data.publicUrl);
        }
    }

    btn.textContent = "Saving to Server...";
    const { error } = await db.from('products_master').insert([{
        sku: sku, name: name, unit: document.getElementById("newSkuUnit").value, 
        price: parseFloat(price), cost_price: parseFloat(cost), category: category, 
        parent_sku: document.getElementById("newParentSku").value.trim().toUpperCase(), 
        commission_rate: parseFloat(document.getElementById("newCommission").value || 0),
        length_cm: parseFloat(document.getElementById("newLength").value || 0), 
        width_cm: parseFloat(document.getElementById("newWidth").value || 0), 
        height_cm: parseFloat(document.getElementById("newHeight").value || 0),
        description: document.getElementById("newDescription").value.trim(), 
        images: uploadedUrls, is_published: pub
    }]);

    if(error) alert(error.message); else { alert("Saved!"); await initApp(); toggleInvForm(''); }
    btn.textContent = "Save Heavy Data Profile"; btn.disabled = false;
};

document.getElementById("startCsvBtn").onclick = function() {
    const fileInput = document.getElementById("csvFileInput");
    if(!fileInput.files.length) return alert("Pilih fail CSV!");
    
    this.disabled = true; this.textContent = "Analyzing Smart Migrator...";
    Papa.parse(fileInput.files[0], {
        header: true, skipEmptyLines: true,
        complete: async function(res) {
            const headers = res.meta.fields || [];
            const isShopify = headers.includes("Variant SKU");
            const isEasyStore = headers.includes("Product Name") && headers.includes("Price");
            
            let payload = [];
            let inventoryPayload = [];

            res.data.forEach(r => {
                let s_sku = "", s_name = "", s_price = 0, s_cost = 0, s_img = "", s_qty = 0;
                if(isShopify) {
                    s_sku = r["Variant SKU"]; s_name = r["Handle"] || r["Title"]; s_price = r["Variant Price"];
                    s_cost = r["Variant Compare At Price"] || 0; s_img = r["Image Src"] || "";
                    s_qty = parseInt(r["Variant Inventory Qty"] || 0);
                } else if(isEasyStore) {
                    s_sku = r["SKU"]; s_name = r["Product Name"]; s_price = r["Price"]; s_cost = r["Cost"];
                    s_qty = parseInt(r["Quantity"] || 0);
                } else {
                    s_sku = r.sku; s_name = r.name; s_price = r.price; s_cost = r.cost_price;
                }
                
                s_sku = (s_sku || "").trim().toUpperCase();
                if(s_sku && s_sku !== "NAN") {
                    payload.push({
                        sku: s_sku, name: s_name || "Migrated Item",
                        category: "Migrated", unit: "Pcs", cost_price: parseFloat(s_cost || 0),
                        price: parseFloat(s_price || 0), commission_rate: 0,
                        is_published: true, images: s_img ? [s_img] : []
                    });
                    if(s_qty > 0) {
                        inventoryPayload.push({
                            sku: s_sku, batch_year: new Date().getFullYear(),
                            qty_received: s_qty, qty_remaining: s_qty
                        });
                    }
                }
            });

            if(payload.length === 0) return alert("Format CSV Tidak Dikenalpasti / Tiada SKU.");
            const btn = document.getElementById("startCsvBtn");
            
            try {
                // Chunking logic (500 items per chunk) to avoid Server Timeout
                let chunkSize = 500;
                for(let i=0; i<payload.length; i+=chunkSize) {
                    btn.textContent = `Upserting Products: ${Math.min(i+chunkSize, payload.length)} / ${payload.length}...`;
                    let chunk = payload.slice(i, i+chunkSize);
                    let { error } = await db.from('products_master').upsert(chunk, { onConflict: 'sku' });
                    if(error) throw error;
                }
                
                for(let i=0; i<inventoryPayload.length; i+=chunkSize) {
                    btn.textContent = `Migrating Inventory: ${Math.min(i+chunkSize, inventoryPayload.length)} / ${inventoryPayload.length}...`;
                    let chunk = inventoryPayload.slice(i, i+chunkSize);
                    let { error } = await db.from('inventory_batches').insert(chunk);
                    if(error) throw error;
                }

                alert(`Migrasi Berjaya! dipindahkan sebanyak: ${payload.length} produk & ${inventoryPayload.length} susunan stok.`); 
                await initApp(); 
                toggleInvForm('');
            } catch(e) {
                alert("Migration Error: " + e.message);
            } finally {
                btn.disabled = false; 
                btn.textContent = "Process Robot Upload";
            }
        }
    });
};

document.getElementById("saveInboundBtn").onclick = async function() {
    const sku = document.getElementById("inboundSkuSelect").value;
    const qty = parseInt(document.getElementById("inboundQty").value);
    if(!sku || isNaN(qty) || qty<=0) return alert("Pilih SKU & Kuantiti Valid!");
    
    const { data: newB, error: err1 } = await db.from('inventory_batches').insert([{
        sku: sku, batch_year: new Date().getFullYear(), qty_received: qty, qty_remaining: qty
    }]).select();

    if(err1) return alert(err1.message);
    await db.from('inventory_transactions').insert([{ sku: sku, batch_id: newB[0].id, transaction_type: 'INBOUND', qty_change: qty }]);
    alert("Inbound Registered."); document.getElementById("inboundQty").value = ""; await initApp();
}


// ===================================
// POS CASHIER FRONTEND
// ===================================
function renderPOS(searchTerm = "") {
    const list = document.getElementById("productsList");
    if(!list) return;
    let htmlBuf = "";
    
    // Reset page if searching
    if(searchTerm !== lastPosSearchTerm) {
        lastPosSearchTerm = searchTerm;
        posCurrentPage = 1;
    }

    let filtered = masterProducts.filter(p => {
        if(p.is_published === false) return false;
        if(searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase()) && !p.sku.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
    });

    const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
    if(posCurrentPage > totalPages) posCurrentPage = totalPages;
    if(posCurrentPage < 1) posCurrentPage = 1;

    let sliced = filtered.slice((posCurrentPage - 1) * itemsPerPage, posCurrentPage * itemsPerPage);

    sliced.forEach(p => {

        const myBatches = inventoryBatches.filter(b => b.sku === p.sku && b.qty_remaining > 0);
        const totalStock = myBatches.reduce((sum, b) => sum + b.qty_remaining, 0);
        let thumb = p.images && p.images[0] ? p.images[0] : "https://placehold.co/300x200?text=No+Img";

        htmlBuf += `
            <div class="product-card">
                <img src="${thumb}">
                <span class="sku-badge">${p.sku}</span><span class="cat-badge">${p.category||'Uncat'}</span>
                <h3 style="margin-top:5px; font-size:14px; height:35px; overflow:hidden;">${p.name}</h3>
                <p class="price">RM ${parseFloat(p.price).toFixed(2)}</p>
                <p style="font-size:12px; margin-bottom:8px;">Instock: ${totalStock} ${p.unit||''}</p>
                <button onclick="addToCart('${p.sku}')" ${totalStock <= 0 ? 'disabled' : ''}>${totalStock <= 0 ? 'Out of Stock' : 'Add >'}</button>
            </div>
        `;
    });
    
    // Pagination Controls UI
    htmlBuf += `
        <div style="width:100%; display:flex; justify-content:center; align-items:center; gap:15px; margin-top:20px; grid-column: 1 / -1; font-size:14px; color:#555;">
            <button onclick="changePosPage(-1)" ${posCurrentPage <= 1 ? 'disabled style="opacity:0.5"' : 'style="cursor:pointer"'} class="custom-btn"> < Prev </button>
            <span>Page <b>${posCurrentPage}</b> of ${totalPages}</span>
            <button onclick="changePosPage(1)" ${posCurrentPage >= totalPages ? 'disabled style="opacity:0.5"' : 'style="cursor:pointer"'} class="custom-btn"> Next > </button>
        </div>
    `;
    list.innerHTML = htmlBuf;
}

window.addToCart = function(sku) {
    const p = masterProducts.find(x => x.sku === sku);
    const totalAvail = inventoryBatches.filter(b => b.sku === sku && b.qty_remaining > 0).reduce((s, b) => s + b.qty_remaining, 0);
    const cartItem = cart.find(c => c.sku === sku);
    
    if(cartItem) { if (cartItem.quantity < totalAvail) cartItem.quantity++; else alert("Limits reached!"); } 
    else { if (totalAvail > 0) cart.push({ sku: sku, name: p.name, price: parseFloat(p.price), quantity: 1 }); }
    renderCart();
}

window.decreaseQuantity = function(sku) {
    const c = cart.find(x => x.sku === sku);
    if(c) { if(c.quantity > 1) c.quantity--; else cart = cart.filter(x => x.sku !== sku); }
    renderCart();
}
window.removeFromCart = function(sku) { cart = cart.filter(c => c.sku !== sku); renderCart(); }

function renderCart() {
    const container = document.getElementById("cartItems");
    const label = document.getElementById("totalPrice");
    if(!container) return; container.innerHTML = ""; let total = 0;
    if(cart.length === 0) { container.innerHTML = "<p>Cart Empty.</p>"; label.textContent = "0.00"; return; }

    cart.forEach(item => {
        total += item.price * item.quantity;
        container.innerHTML += `
            <div class="cart-item">
                <div><strong style="font-size:14px;">[${item.sku}] ${item.name}</strong><br><small>RM${item.price.toFixed(2)} x ${item.quantity}</small></div>
                <div style="display:flex; gap:5px; align-items:center;">
                    <button onclick="decreaseQuantity('${item.sku}')">-</button><span>${item.quantity}</span>
                    <button onclick="addToCart('${item.sku}')">+</button><button onclick="removeFromCart('${item.sku}')" style="color:red; background:none; border:none;">X</button>
                </div>
            </div>`;
    });
    label.textContent = total.toFixed(2);
}

document.getElementById("checkoutBtn").onclick = async function() {
    if(cart.length === 0) return alert("Empty Cart!");
    this.disabled = true; this.textContent = "Processing Omnichannel FIFO...";

    try {
        let transactionsPayload = []; let totalVal = 0;
        const cn = document.getElementById("checkoutChannel").value;
        const cst = document.getElementById("checkoutStatus").value;
        const pm = document.getElementById("paymentMethod").value;
        const custNameText = document.getElementById("customerName").value.trim() || 'Walk-In';

        for (const item of cart) {
            totalVal += item.price * item.quantity;
            let needed = item.quantity;
            let batches = inventoryBatches.filter(b => b.sku===item.sku && b.qty_remaining>0).sort((a,b) => new Date(a.inbound_date) - new Date(b.inbound_date));
            
            for (let batch of batches) {
                if (needed <= 0) break;
                let deduct = Math.min(needed, batch.qty_remaining);
                needed -= deduct;
                await db.from('inventory_batches').update({qty_remaining: batch.qty_remaining - deduct}).eq('id', batch.id);
                transactionsPayload.push({sku: item.sku, batch_id: batch.id, transaction_type: 'OUTBOUND_SALE', qty_change: -deduct});
            }
        }

        if(transactionsPayload.length > 0) await db.from('inventory_transactions').insert(transactionsPayload);

        // Simple CRM Insert (Checks if name exist, if not, save as basic returning mechanism)
        if(custNameText !== 'Walk-In') {
             const existing = customersData.find(c => c.name.toLowerCase() === custNameText.toLowerCase());
             if(!existing) await db.from('customers').insert([{name: custNameText, points: 10}]);
        }

        await db.from('sales_history').insert([{
            customer_name: custNameText, payment_method: pm, channel: cn, status: cst, total: totalVal, items: cart
        }]);

        const invId = "INV-10C-" + Math.floor(1000 + Math.random() * 9000);
        const email = document.getElementById("customerEmail").value.trim();
        showReceiptModal(invId, custNameText, email, totalVal, [...cart]);

        cart = []; 
        document.getElementById("customerName").value = "";
        document.getElementById("customerEmail").value = "";
        await initApp(); renderCart();
    } catch (e) { alert("Fatal Error: " + e.message); }
    
    this.disabled = false; this.textContent = "Send Order to Queue";
}

// ===================================
// CUSTOMERS CRM TABLE
// ===================================
function renderCustomers() {
    const tbody = document.getElementById("customersTableBody");
    if(!tbody) return;
    tbody.innerHTML = "";
    if(customersData.length === 0) { tbody.innerHTML = '<tr><td colspan="4">Tiada pelanggan berdaftar.</td></tr>'; return; }
    customersData.forEach(c => {
        tbody.innerHTML += `<tr>
            <td><strong>${c.name}</strong></td>
            <td>${c.phone || '-'}</td>
            <td style="color:#F59E0B; font-weight:bold;">${c.points || 0} pts</td>
            <td>${c.is_member ? '<span style="color:#10B981; font-weight:bold;">VIP ✓</span>' : '<span style="color:#aaa;">Non-Member</span>'}</td>
        </tr>`;
    });
}

// ===================================
// PROMOTIONS TABLE
// ===================================
function renderPromotions() {
    const tbody = document.getElementById("promotionsTableBody");
    if(!tbody) return;
    tbody.innerHTML = "";
    db.from('promotions').select('*').then(({data}) => {
        if(!data || data.length === 0) { tbody.innerHTML = '<tr><td colspan="4">Tiada promosi aktif.</td></tr>'; return; }
        data.forEach(p => {
            tbody.innerHTML += `<tr>
                <td><strong>${p.code}</strong></td>
                <td>${p.discount_type}</td>
                <td style="font-weight:bold;">${p.discount_type === 'percent' ? p.discount_value + '%' : 'RM' + parseFloat(p.discount_value).toFixed(2)}</td>
                <td>${p.active ? '<span style="color:#10B981; font-weight:bold;">Active ✓</span>' : '<span style="color:#EF4444;">Inactive</span>'}</td>
            </tr>`;
        });
    });
}

// ===================================
// AUTHENTICATION LOGIC (MULTI-USER)
// ===================================

const authUsers = [
    { name: 'Admin Bos', role: 'admin', pin: '8888' },
    { name: 'Staff Aina', role: 'staff', pin: '1111' },
    { name: 'Staff Badrul', role: 'staff', pin: '2222' },
    { name: 'Staff Chong', role: 'staff', pin: '3333' },
    { name: 'Staff Diana', role: 'staff', pin: '4444' },
    { name: 'Staff Ewan', role: 'staff', pin: '5555' },
    { name: 'Staff Farah', role: 'staff', pin: '6666' },
    { name: 'Staff Gopi', role: 'staff', pin: '7777' },
    { name: 'Staff Hafiz', role: 'staff', pin: '1010' },
    { name: 'Staff Izzat', role: 'staff', pin: '2020' },
    { name: 'Staff Jamil', role: 'staff', pin: '3030' }
];

let currentUser = null;
let currentUserRole = null;

function handleLogin() {
    const pin = document.getElementById("loginPin").value;
    if(!pin) { alert("Sila masukkan PIN!"); return; }
    
    const user = authUsers.find(u => u.pin === pin);
    if(!user) { alert("Akses Ditolak: PIN Salah atau Tidak Wujud!"); return; }
    
    currentUser = user;
    currentUserRole = user.role;
    
    document.getElementById("loginGate").style.display = "none";
    document.getElementById("shopAppLayout").style.display = "none";
    document.getElementById("posAppLayout").style.display = "block";
    document.getElementById("sessionUsername").textContent = "Hi, " + (user.name.split(' ')[1] || user.name) + (user.role === 'admin' ? ' 👑' : '');
    
    const adminMenus = document.querySelectorAll(".admin-only");
    
    if(user.role === 'staff') {
        adminMenus.forEach(el => el.style.display = "none");
        document.querySelector('.menu-item[data-tab="home"]').classList.remove('active');
        switchTab("pos", "Cashier POS"); 
    } else {
        adminMenus.forEach(el => el.style.display = "flex");
        switchTab("home", "Dashboard"); 
    }
}

function handleLogout() {
    currentUser = null;
    currentUserRole = null;
    document.getElementById("loginGate").style.display = "none";
    document.getElementById("shopAppLayout").style.display = "block";
    document.getElementById("posAppLayout").style.display = "none";
    document.getElementById("loginPin").value = "";
    document.getElementById("sessionUsername").textContent = "EasyPOS PRO";
    document.getElementById("appSidebar").classList.remove('open');
    document.getElementById("sidebarOverlay").classList.remove('active');
    
    const allSections = document.querySelectorAll(".tab-section");
    allSections.forEach(el => el.style.display = "none");
}

setTimeout(() => {
    document.getElementById("searchInput")?.addEventListener('input', e => renderPOS(e.target.value));
    const dateObj = new Date();
    const firstDay = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1);
    document.getElementById('dashStartDate').value = firstDay.toISOString().split('T')[0];
    document.getElementById('dashEndDate').value = dateObj.toISOString().split('T')[0];
    
    if(db) initApp();
}, 200);

// ===================================
// PUBLIC E-COMMERCE ENGINE
// ===================================
function renderPublicStorefront() {
    const list = document.getElementById("publicProductsList");
    if(!list) return;
    let htmlBuf2 = "";

    let filtered = masterProducts.filter(p => p.is_published !== false);
    const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
    if(publicCurrentPage > totalPages) publicCurrentPage = totalPages;
    if(publicCurrentPage < 1) publicCurrentPage = 1;

    let sliced = filtered.slice((publicCurrentPage - 1) * itemsPerPage, publicCurrentPage * itemsPerPage);

    sliced.forEach(p => {

        const myBatches = inventoryBatches.filter(b => b.sku === p.sku && b.qty_remaining > 0);
        const totalStock = myBatches.reduce((sum, b) => sum + b.qty_remaining, 0);
        let thumb = p.images && p.images[0] ? p.images[0] : "https://placehold.co/300x200?text=No+Img";

        htmlBuf2 += `
            <div class="product-card" style="border:none; box-shadow:0 4px 15px rgba(0,0,0,0.05); padding:0; overflow:hidden;">
                <img src="${thumb}" style="width:100%; height:200px; object-fit:cover;">
                <div style="padding:15px;">
                    <span class="cat-badge">${p.category||'Uncat'}</span>
                    <h3 style="margin-top:10px; font-size:16px; height:40px; overflow:hidden; font-weight:700;">${p.name}</h3>
                    <p class="price" style="font-size:18px; font-weight:900;">RM ${parseFloat(p.price).toFixed(2)}</p>
                    <button onclick="addToPublicCart('${p.sku}')" style="width:100%; border-radius:50px; background:#111; color:white; padding:12px; border:none; margin-top:10px; cursor:pointer; font-weight:bold; font-size:13px;" ${totalStock <= 0 ? 'disabled' : ''}>${totalStock <= 0 ? 'Sold Out' : 'Add to Cart 🛒'}</button>
                </div>
            </div>
        `;
    });
    
    htmlBuf2 += `
        <div style="width:100%; display:flex; justify-content:center; align-items:center; gap:20px; margin-top:30px; grid-column: 1 / -1; font-family:Inter;">
            <button onclick="changePublicPage(-1)" ${publicCurrentPage <= 1 ? 'disabled style="opacity:0.5"' : 'style="cursor:pointer"'} style="padding:10px 20px; background:#f0f0f0; border:none; border-radius:5px; font-weight:bold;">◀ Back</button>
            <span style="font-size:15px; color:#444;">Page <b>${publicCurrentPage}</b> / ${totalPages}</span>
            <button onclick="changePublicPage(1)" ${publicCurrentPage >= totalPages ? 'disabled style="opacity:0.5"' : 'style="cursor:pointer"'} style="padding:10px 20px; background:#111; color:white; border:none; border-radius:5px; font-weight:bold;">Next ▶</button>
        </div>
    `;
    list.innerHTML = htmlBuf2;
}

let publicCart = [];

window.togglePublicCart = function() {
    const drw = document.getElementById("publicCartDrawer");
    if(drw.style.display === "none") {
        drw.style.display = "flex";
        renderPublicCart();
    } else {
        drw.style.display = "none";
    }
}

window.addToPublicCart = function(sku) {
    const p = masterProducts.find(x => x.sku === sku);
    const totalAvail = inventoryBatches.filter(b => b.sku === sku && b.qty_remaining > 0).reduce((s, b) => s + b.qty_remaining, 0);
    const cartItem = publicCart.find(c => c.sku === sku);
    
    if(cartItem) { if (cartItem.quantity < totalAvail) cartItem.quantity++; else alert("Limits reached!"); } 
    else { if (totalAvail > 0) publicCart.push({ sku: sku, name: p.name, price: parseFloat(p.price), quantity: 1 }); }
    
    document.getElementById("btnPublicCartCount").textContent = `Cart (${publicCart.reduce((s, c) => s + c.quantity, 0)})`;
    alert("Ditambah ke troli!");
}

window.decreasePublicQty = function(sku) {
    const c = publicCart.find(x => x.sku === sku);
    if(c) { if(c.quantity > 1) c.quantity--; else publicCart = publicCart.filter(x => x.sku !== sku); }
    renderPublicCart();
}

window.increasePublicQty = function(sku) {
    const p = masterProducts.find(x => x.sku === sku);
    const totalAvail = inventoryBatches.filter(b => b.sku === sku && b.qty_remaining > 0).reduce((s, b) => s + b.qty_remaining, 0);
    const cartItem = publicCart.find(c => c.sku === sku);
    if(cartItem) { if (cartItem.quantity < totalAvail) cartItem.quantity++; } 
    renderPublicCart();
}

window.removePublicCart = function(sku) {
    publicCart = publicCart.filter(c => c.sku !== sku); 
    renderPublicCart(); 
}

function renderPublicCart() {
    const container = document.getElementById("publicCartItems");
    const label = document.getElementById("publicCartTotalLabel");
    document.getElementById("btnPublicCartCount").textContent = `Cart (${publicCart.reduce((s, c) => s + c.quantity, 0)})`;
    
    if(!container) return; 
    container.innerHTML = ""; 
    let total = 0;
    
    if(publicCart.length === 0) { container.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding-top:20px;">Your cart is empty.</p>'; label.textContent = "0.00"; return; }

    publicCart.forEach(item => {
        total += item.price * item.quantity;
        container.innerHTML += `
            <div style="display:flex; justify-content:space-between; margin-bottom:15px; border-bottom:1px solid #f9f9f9; padding-bottom:10px;">
                <div>
                    <strong style="font-size:14px; display:block;">${item.name}</strong>
                    <small style="color:var(--text-muted);">RM${item.price.toFixed(2)} x ${item.quantity}</small>
                </div>
                <div style="display:flex; gap:8px; align-items:center;">
                    <button onclick="decreasePublicQty('${item.sku}')" style="border:1px solid #ddd; background:#fff; width:24px; height:24px; cursor:pointer;">-</button>
                    <span>${item.quantity}</span>
                    <button onclick="increasePublicQty('${item.sku}')" style="border:1px solid #ddd; background:#fff; width:24px; height:24px; cursor:pointer;">+</button>
                    <button onclick="removePublicCart('${item.sku}')" style="color:red; background:none; border:none; cursor:pointer; margin-left:5px;">X</button>
                </div>
            </div>`;
    });
    label.textContent = total.toFixed(2);
}

window.processPublicCheckout = async function() {
    if(publicCart.length === 0) return alert("Cart is empty!");
    
    const cName = document.getElementById("custNamePub").value.trim();
    const cPhone = document.getElementById("custPhonePub").value.trim();
    const cAddr = document.getElementById("custAddressPub").value.trim();
    
    if(!cName || !cPhone || !cAddr) return alert("Sila isikan Nama, Telefon, dan Alamat Penghantaran dengan lengkap!");
    
    const btn = document.getElementById("btnPublicCheckout");
    btn.disabled = true; btn.textContent = "Processing Payment...";

    try {
        let transactionsPayload = []; let totalVal = 0;

        for (const item of publicCart) {
            totalVal += item.price * item.quantity;
            let needed = item.quantity;
            let batches = inventoryBatches.filter(b => b.sku===item.sku && b.qty_remaining>0).sort((a,b) => new Date(a.inbound_date) - new Date(b.inbound_date));
            
            for (let batch of batches) {
                if (needed <= 0) break;
                let deduct = Math.min(needed, batch.qty_remaining);
                needed -= deduct;
                await db.from('inventory_batches').update({qty_remaining: batch.qty_remaining - deduct}).eq('id', batch.id);
                transactionsPayload.push({sku: item.sku, batch_id: batch.id, transaction_type: 'OUTBOUND_SALE', qty_change: -deduct});
            }
        }

        if(transactionsPayload.length > 0) await db.from('inventory_transactions').insert(transactionsPayload);

        // Simple CRM Concept
        const existing = customersData.find(c => c.name.toLowerCase() === cName.toLowerCase());
        if(!existing) await db.from('customers').insert([{name: cName, phone: cPhone, address: cAddr, points: 5}]);

        // Push to Sales History as E-Commerce Website Order
        const invStr = "WEB-10C-" + Math.floor(1000 + Math.random() * 9000);
        await db.from('sales_history').insert([{
            channel: 'Website',
            status: 'Pending Fulfillment',
            customer_name: cName, 
            payment_method: 'Online Transfer',
            total: totalVal, 
            items: publicCart
        }]);

        publicCart = []; 
        document.getElementById("custNamePub").value = "";
        document.getElementById("custPhonePub").value = "";
        document.getElementById("custAddressPub").value = "";
        
        // Let the customer see the simulated success pop up
        togglePublicCart();
        alert(`Pembayaran Berjaya! Nombor Resit: ${invStr}.\nTerima kasih kerana membeli bersama 10camp.`);
        
        await initApp(); // refresh background dashboard data
    } catch (e) { alert("Fatal Error: " + e.message); }
    
    btn.disabled = false; btn.textContent = "Confirm Order";
}

// ===================================
// E-RECEIPT & EMAIL SYSTEM
// ===================================
let currentReceiptContext = null;

function showReceiptModal(invId, custName, email, total, cartData) {
    const rc = document.getElementById("receiptContent");
    const d = new Date().toLocaleString('en-GB');
    let itemsHtml = "";
    cartData.forEach(c => {
        itemsHtml += `<div style="margin-bottom:5px;">${c.quantity}x ${c.name} <span style="float:right">RM ${(c.price * c.quantity).toFixed(2)}</span></div>`;
    });

    rc.innerHTML = `
        <div style="font-weight:bold; margin-bottom:10px;">INVOICE: ${invId}</div>
        <div style="color:var(--text-muted);">Date: ${d}</div>
        <div style="color:var(--text-muted);">Customer: ${custName}</div>
        <div style="color:var(--text-muted); margin-bottom:10px;">Cashier: ${currentUser?.name || 'Staff'}</div>
        <hr style="border-top:1px dashed #ccc; margin:10px 0;">
        ${itemsHtml}
        <hr style="border-top:1px dashed #ccc; margin:10px 0;">
        <div style="font-size:16px; font-weight:bold;">TOTAL <span style="float:right">RM ${total.toFixed(2)}</span></div>
        <div style="text-align:center; margin-top:30px; font-weight:bold; font-size:11px; color:var(--text-muted);">THANK YOU FOR SHOPPING AT 10CAMP</div>
    `;
    
    currentReceiptContext = { invId, custName, email, total, itemsText: cartData.map(c => `${c.quantity}x ${c.name} - RM ${(c.price * c.quantity).toFixed(2)}`).join('%0D%0A') };
    document.getElementById("receiptModal").style.display = "flex";
}

window.closeReceipt = function() {
    document.getElementById("receiptModal").style.display = "none";
};

document.getElementById("sendEmailBtn").onclick = function() {
    if(!currentReceiptContext) return;
    const { invId, custName, email, total, itemsText } = currentReceiptContext;
    const targetEmail = email || "";
    if(!targetEmail) { alert("Sila masukkan emel pelanggan terlebih dahulu sebelum menghantar resit."); return; }

    const subject = `E-Receipt ${invId} from 10camp`;
    const body = `Hi ${custName},%0D%0A%0D%0AThank you for shopping at 10camp! Here is your e-receipt:%0D%0A%0D%0AInvoice: ${invId}%0D%0A%0D%0AItems:%0D%0A${itemsText}%0D%0A%0D%0ATOTAL: RM ${total.toFixed(2)}%0D%0A%0D%0AHope to see you again soon!`;
    
    window.location.href = `mailto:${targetEmail}?subject=${subject}&body=${body}`;
};
