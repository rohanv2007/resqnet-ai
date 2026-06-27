// 100+ major Indian cities (state capitals + metros + critical hazard cities)
// Used as the computation grid for India-wide risk layers.
export interface IndiaCity {
  name: string;
  state: string;
  lat: number;
  lng: number;
  population: number;
  coastal?: boolean;
  hilly?: boolean;
  riverine?: boolean;
}

export const INDIA_CITIES: IndiaCity[] = [
  // North
  { name: "New Delhi", state: "Delhi", lat: 28.6139, lng: 77.2090, population: 21800000, riverine: true },
  { name: "Chandigarh", state: "Chandigarh", lat: 30.7333, lng: 76.7794, population: 1055000 },
  { name: "Shimla", state: "Himachal Pradesh", lat: 31.1048, lng: 77.1734, population: 169000, hilly: true },
  { name: "Manali", state: "Himachal Pradesh", lat: 32.2396, lng: 77.1887, population: 8000, hilly: true },
  { name: "Dharamshala", state: "Himachal Pradesh", lat: 32.2190, lng: 76.3234, population: 30000, hilly: true },
  { name: "Srinagar", state: "Jammu & Kashmir", lat: 34.0837, lng: 74.7973, population: 1180000, hilly: true, riverine: true },
  { name: "Jammu", state: "Jammu & Kashmir", lat: 32.7266, lng: 74.8570, population: 503000 },
  { name: "Leh", state: "Ladakh", lat: 34.1526, lng: 77.5770, population: 30000, hilly: true },
  { name: "Amritsar", state: "Punjab", lat: 31.6340, lng: 74.8723, population: 1132000 },
  { name: "Ludhiana", state: "Punjab", lat: 30.9010, lng: 75.8573, population: 1618000 },
  { name: "Jaipur", state: "Rajasthan", lat: 26.9124, lng: 75.7873, population: 3046000 },
  { name: "Jodhpur", state: "Rajasthan", lat: 26.2389, lng: 73.0243, population: 1138000 },
  { name: "Udaipur", state: "Rajasthan", lat: 24.5854, lng: 73.7125, population: 451000 },
  { name: "Bikaner", state: "Rajasthan", lat: 28.0229, lng: 73.3119, population: 644000 },
  { name: "Dehradun", state: "Uttarakhand", lat: 30.3165, lng: 78.0322, population: 803000, hilly: true },
  { name: "Haridwar", state: "Uttarakhand", lat: 29.9457, lng: 78.1642, population: 310000, riverine: true },
  { name: "Joshimath", state: "Uttarakhand", lat: 30.5544, lng: 79.5640, population: 16500, hilly: true },
  { name: "Lucknow", state: "Uttar Pradesh", lat: 26.8467, lng: 80.9462, population: 3500000 },
  { name: "Kanpur", state: "Uttar Pradesh", lat: 26.4499, lng: 80.3319, population: 3100000, riverine: true },
  { name: "Varanasi", state: "Uttar Pradesh", lat: 25.3176, lng: 82.9739, population: 1435000, riverine: true },
  { name: "Agra", state: "Uttar Pradesh", lat: 27.1767, lng: 78.0081, population: 1746000 },
  { name: "Allahabad (Prayagraj)", state: "Uttar Pradesh", lat: 25.4358, lng: 81.8463, population: 1216000, riverine: true },
  { name: "Gorakhpur", state: "Uttar Pradesh", lat: 26.7606, lng: 83.3732, population: 692000, riverine: true },

  // East
  { name: "Kolkata", state: "West Bengal", lat: 22.5726, lng: 88.3639, population: 14850000, coastal: true, riverine: true },
  { name: "Howrah", state: "West Bengal", lat: 22.5958, lng: 88.2636, population: 1077000, riverine: true },
  { name: "Siliguri", state: "West Bengal", lat: 26.7271, lng: 88.3953, population: 514000, hilly: true },
  { name: "Darjeeling", state: "West Bengal", lat: 27.0410, lng: 88.2663, population: 132000, hilly: true },
  { name: "Patna", state: "Bihar", lat: 25.5941, lng: 85.1376, population: 2046000, riverine: true },
  { name: "Gaya", state: "Bihar", lat: 24.7914, lng: 85.0002, population: 463000 },
  { name: "Bhagalpur", state: "Bihar", lat: 25.2425, lng: 86.9842, population: 410000, riverine: true },
  { name: "Ranchi", state: "Jharkhand", lat: 23.3441, lng: 85.3096, population: 1126000 },
  { name: "Jamshedpur", state: "Jharkhand", lat: 22.8046, lng: 86.2029, population: 1340000 },
  { name: "Bhubaneswar", state: "Odisha", lat: 20.2961, lng: 85.8245, population: 837000, coastal: true },
  { name: "Cuttack", state: "Odisha", lat: 20.4625, lng: 85.8828, population: 663000, riverine: true },
  { name: "Puri", state: "Odisha", lat: 19.8135, lng: 85.8312, population: 200000, coastal: true },
  { name: "Paradip", state: "Odisha", lat: 20.3158, lng: 86.6111, population: 84000, coastal: true },
  { name: "Berhampur", state: "Odisha", lat: 19.3149, lng: 84.7941, population: 356000, coastal: true },

  // North-East
  { name: "Guwahati", state: "Assam", lat: 26.1445, lng: 91.7362, population: 957000, riverine: true },
  { name: "Dibrugarh", state: "Assam", lat: 27.4728, lng: 94.9120, population: 154000, riverine: true },
  { name: "Silchar", state: "Assam", lat: 24.8333, lng: 92.7789, population: 229000 },
  { name: "Shillong", state: "Meghalaya", lat: 25.5788, lng: 91.8933, population: 354000, hilly: true },
  { name: "Imphal", state: "Manipur", lat: 24.8170, lng: 93.9368, population: 268000, hilly: true },
  { name: "Aizawl", state: "Mizoram", lat: 23.7271, lng: 92.7176, population: 293000, hilly: true },
  { name: "Kohima", state: "Nagaland", lat: 25.6747, lng: 94.1086, population: 99000, hilly: true },
  { name: "Itanagar", state: "Arunachal Pradesh", lat: 27.0844, lng: 93.6053, population: 60000, hilly: true },
  { name: "Agartala", state: "Tripura", lat: 23.8315, lng: 91.2868, population: 400000 },
  { name: "Gangtok", state: "Sikkim", lat: 27.3389, lng: 88.6065, population: 100000, hilly: true },

  // Central
  { name: "Bhopal", state: "Madhya Pradesh", lat: 23.2599, lng: 77.4126, population: 1798000 },
  { name: "Indore", state: "Madhya Pradesh", lat: 22.7196, lng: 75.8577, population: 1964000 },
  { name: "Jabalpur", state: "Madhya Pradesh", lat: 23.1815, lng: 79.9864, population: 1054000, riverine: true },
  { name: "Gwalior", state: "Madhya Pradesh", lat: 26.2183, lng: 78.1828, population: 1054000 },
  { name: "Raipur", state: "Chhattisgarh", lat: 21.2514, lng: 81.6296, population: 1010000 },
  { name: "Bilaspur", state: "Chhattisgarh", lat: 22.0797, lng: 82.1409, population: 367000 },

  // West
  { name: "Mumbai", state: "Maharashtra", lat: 19.0760, lng: 72.8777, population: 20400000, coastal: true },
  { name: "Pune", state: "Maharashtra", lat: 18.5204, lng: 73.8567, population: 3124000 },
  { name: "Nagpur", state: "Maharashtra", lat: 21.1458, lng: 79.0882, population: 2405000 },
  { name: "Nashik", state: "Maharashtra", lat: 19.9975, lng: 73.7898, population: 1486000 },
  { name: "Aurangabad", state: "Maharashtra", lat: 19.8762, lng: 75.3433, population: 1175000 },
  { name: "Thane", state: "Maharashtra", lat: 19.2183, lng: 72.9781, population: 1841000, coastal: true },
  { name: "Ratnagiri", state: "Maharashtra", lat: 16.9902, lng: 73.3120, population: 76000, coastal: true },
  { name: "Ahmedabad", state: "Gujarat", lat: 23.0225, lng: 72.5714, population: 5570000 },
  { name: "Surat", state: "Gujarat", lat: 21.1702, lng: 72.8311, population: 4467000, coastal: true },
  { name: "Vadodara", state: "Gujarat", lat: 22.3072, lng: 73.1812, population: 1822000 },
  { name: "Rajkot", state: "Gujarat", lat: 22.3039, lng: 70.8022, population: 1286000 },
  { name: "Bhuj", state: "Gujarat", lat: 23.2420, lng: 69.6669, population: 188000 },
  { name: "Gandhinagar", state: "Gujarat", lat: 23.2156, lng: 72.6369, population: 292000 },
  { name: "Panaji", state: "Goa", lat: 15.4909, lng: 73.8278, population: 114000, coastal: true },
  { name: "Margao", state: "Goa", lat: 15.2832, lng: 73.9862, population: 87000, coastal: true },

  // South
  { name: "Bengaluru", state: "Karnataka", lat: 12.9716, lng: 77.5946, population: 12300000 },
  { name: "Mysuru", state: "Karnataka", lat: 12.2958, lng: 76.6394, population: 920000 },
  { name: "Mangaluru", state: "Karnataka", lat: 12.9141, lng: 74.8560, population: 619000, coastal: true },
  { name: "Hubballi", state: "Karnataka", lat: 15.3647, lng: 75.1240, population: 943000 },
  { name: "Belagavi", state: "Karnataka", lat: 15.8497, lng: 74.4977, population: 610000 },
  { name: "Chennai", state: "Tamil Nadu", lat: 13.0827, lng: 80.2707, population: 10970000, coastal: true },
  { name: "Coimbatore", state: "Tamil Nadu", lat: 11.0168, lng: 76.9558, population: 1601000 },
  { name: "Madurai", state: "Tamil Nadu", lat: 9.9252, lng: 78.1198, population: 1465000 },
  { name: "Tiruchirappalli", state: "Tamil Nadu", lat: 10.7905, lng: 78.7047, population: 916000 },
  { name: "Salem", state: "Tamil Nadu", lat: 11.6643, lng: 78.1460, population: 829000 },
  { name: "Tirunelveli", state: "Tamil Nadu", lat: 8.7139, lng: 77.7567, population: 474000 },
  { name: "Nagapattinam", state: "Tamil Nadu", lat: 10.7672, lng: 79.8449, population: 102000, coastal: true },
  { name: "Hyderabad", state: "Telangana", lat: 17.3850, lng: 78.4867, population: 10500000 },
  { name: "Warangal", state: "Telangana", lat: 17.9689, lng: 79.5941, population: 750000 },
  { name: "Karimnagar", state: "Telangana", lat: 18.4386, lng: 79.1288, population: 297000 },
  { name: "Vijayawada", state: "Andhra Pradesh", lat: 16.5062, lng: 80.6480, population: 1750000, riverine: true },
  { name: "Visakhapatnam", state: "Andhra Pradesh", lat: 17.6868, lng: 83.2185, population: 2035000, coastal: true },
  { name: "Tirupati", state: "Andhra Pradesh", lat: 13.6288, lng: 79.4192, population: 374000 },
  { name: "Kakinada", state: "Andhra Pradesh", lat: 16.9891, lng: 82.2475, population: 312000, coastal: true },
  { name: "Nellore", state: "Andhra Pradesh", lat: 14.4426, lng: 79.9865, population: 547000, coastal: true },
  { name: "Thiruvananthapuram", state: "Kerala", lat: 8.5241, lng: 76.9366, population: 957000, coastal: true },
  { name: "Kochi", state: "Kerala", lat: 9.9312, lng: 76.2673, population: 677000, coastal: true },
  { name: "Kozhikode", state: "Kerala", lat: 11.2588, lng: 75.7804, population: 609000, coastal: true },
  { name: "Thrissur", state: "Kerala", lat: 10.5276, lng: 76.2144, population: 315000 },
  { name: "Kollam", state: "Kerala", lat: 8.8932, lng: 76.6141, population: 350000, coastal: true },
  { name: "Alappuzha", state: "Kerala", lat: 9.4981, lng: 76.3388, population: 174000, coastal: true },
  { name: "Wayanad", state: "Kerala", lat: 11.6854, lng: 76.1320, population: 817000, hilly: true },

  // Islands
  { name: "Port Blair", state: "Andaman & Nicobar", lat: 11.6234, lng: 92.7265, population: 108000, coastal: true },
  { name: "Kavaratti", state: "Lakshadweep", lat: 10.5667, lng: 72.6417, population: 11000, coastal: true },
  { name: "Puducherry", state: "Puducherry", lat: 11.9416, lng: 79.8083, population: 657000, coastal: true },
  { name: "Diu", state: "Daman & Diu", lat: 20.7144, lng: 70.9874, population: 23000, coastal: true },
];

export const INDIA_BBOX = { minLat: 6.5, maxLat: 37.5, minLng: 68.0, maxLng: 97.5 };
export const INDIA_CENTER: [number, number] = [22.5, 79.0];
