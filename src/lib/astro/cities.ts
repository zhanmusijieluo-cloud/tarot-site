// 出生城市库 (A5 骨架版): 常用城市 → 经纬度 + 标准时区偏移
// 注意: 存的是标准时偏移; 有夏令时地区的出生时刻, 二期接历史时区库校正
export interface City {
  id: string
  zh: string
  en: string
  lat: number
  lng: number
  tz: number // UTC 偏移(小时)
}

export const CITIES: City[] = [
  // ---- 中国 (全境 UTC+8, 无夏令时) ----
  { id: 'beijing', zh: '北京', en: 'Beijing', lat: 39.9042, lng: 116.4074, tz: 8 },
  { id: 'shanghai', zh: '上海', en: 'Shanghai', lat: 31.2304, lng: 121.4737, tz: 8 },
  { id: 'guangzhou', zh: '广州', en: 'Guangzhou', lat: 23.1291, lng: 113.2644, tz: 8 },
  { id: 'shenzhen', zh: '深圳', en: 'Shenzhen', lat: 22.5431, lng: 114.0579, tz: 8 },
  { id: 'chengdu', zh: '成都', en: 'Chengdu', lat: 30.5728, lng: 104.0668, tz: 8 },
  { id: 'hangzhou', zh: '杭州', en: 'Hangzhou', lat: 30.2741, lng: 120.1551, tz: 8 },
  { id: 'wuhan', zh: '武汉', en: 'Wuhan', lat: 30.5928, lng: 114.3055, tz: 8 },
  { id: 'xian', zh: '西安', en: "Xi'an", lat: 34.3416, lng: 108.9398, tz: 8 },
  { id: 'chongqing', zh: '重庆', en: 'Chongqing', lat: 29.563, lng: 106.5516, tz: 8 },
  { id: 'nanjing', zh: '南京', en: 'Nanjing', lat: 32.0603, lng: 118.7969, tz: 8 },
  { id: 'tianjin', zh: '天津', en: 'Tianjin', lat: 39.0842, lng: 117.201, tz: 8 },
  { id: 'suzhou', zh: '苏州', en: 'Suzhou', lat: 31.2989, lng: 120.5853, tz: 8 },
  { id: 'changsha', zh: '长沙', en: 'Changsha', lat: 28.2278, lng: 112.9388, tz: 8 },
  { id: 'zhengzhou', zh: '郑州', en: 'Zhengzhou', lat: 34.7466, lng: 113.6254, tz: 8 },
  { id: 'qingdao', zh: '青岛', en: 'Qingdao', lat: 36.0671, lng: 120.3826, tz: 8 },
  { id: 'dalian', zh: '大连', en: 'Dalian', lat: 38.914, lng: 121.6147, tz: 8 },
  { id: 'xiamen', zh: '厦门', en: 'Xiamen', lat: 24.4798, lng: 118.0894, tz: 8 },
  { id: 'kunming', zh: '昆明', en: 'Kunming', lat: 25.0389, lng: 102.7183, tz: 8 },
  { id: 'harbin', zh: '哈尔滨', en: 'Harbin', lat: 45.8038, lng: 126.534, tz: 8 },
  { id: 'shenyang', zh: '沈阳', en: 'Shenyang', lat: 41.8057, lng: 123.4315, tz: 8 },
  { id: 'fuzhou', zh: '福州', en: 'Fuzhou', lat: 26.0745, lng: 119.2965, tz: 8 },
  { id: 'jinan', zh: '济南', en: 'Jinan', lat: 36.6512, lng: 117.1201, tz: 8 },
  { id: 'urumqi', zh: '乌鲁木齐', en: 'Urumqi', lat: 43.8256, lng: 87.6168, tz: 8 },
  { id: 'lhasa', zh: '拉萨', en: 'Lhasa', lat: 29.65, lng: 91.1409, tz: 8 },
  { id: 'haikou', zh: '海口', en: 'Haikou', lat: 20.0444, lng: 110.1999, tz: 8 },
  { id: 'taipei', zh: '台北', en: 'Taipei', lat: 25.033, lng: 121.5654, tz: 8 },
  { id: 'hongkong', zh: '香港', en: 'Hong Kong', lat: 22.3193, lng: 114.1694, tz: 8 },

  // ---- 东亚/东南亚 ----
  { id: 'tokyo', zh: '东京', en: 'Tokyo', lat: 35.6762, lng: 139.6503, tz: 9 },
  { id: 'osaka', zh: '大阪', en: 'Osaka', lat: 34.6937, lng: 135.5023, tz: 9 },
  { id: 'seoul', zh: '首尔', en: 'Seoul', lat: 37.5665, lng: 126.978, tz: 9 },
  { id: 'singapore', zh: '新加坡', en: 'Singapore', lat: 1.3521, lng: 103.8198, tz: 8 },
  { id: 'bangkok', zh: '曼谷', en: 'Bangkok', lat: 13.7563, lng: 100.5018, tz: 7 },
]

export const CITIES_WORLD: City[] = [
  { id: 'london', zh: '伦敦', en: 'London', lat: 51.5074, lng: -0.1278, tz: 0 },
  { id: 'paris', zh: '巴黎', en: 'Paris', lat: 48.8566, lng: 2.3522, tz: 1 },
  { id: 'berlin', zh: '柏林', en: 'Berlin', lat: 52.52, lng: 13.405, tz: 1 },
  { id: 'moscow', zh: '莫斯科', en: 'Moscow', lat: 55.7558, lng: 37.6173, tz: 3 },
  { id: 'sydney', zh: '悉尼', en: 'Sydney', lat: -33.8688, lng: 151.2093, tz: 10 },
  { id: 'newyork', zh: '纽约', en: 'New York', lat: 40.7128, lng: -74.006, tz: -5 },
  { id: 'losangeles', zh: '洛杉矶', en: 'Los Angeles', lat: 34.0522, lng: -118.2437, tz: -8 },
  { id: 'chicago', zh: '芝加哥', en: 'Chicago', lat: 41.8781, lng: -87.6298, tz: -6 },
  { id: 'honolulu', zh: '檀香山', en: 'Honolulu', lat: 21.3069, lng: -157.8583, tz: -10 },
  { id: 'toronto', zh: '多伦多', en: 'Toronto', lat: 43.6532, lng: -79.3832, tz: -5 },
  { id: 'saopaulo', zh: '圣保罗', en: 'São Paulo', lat: -23.5505, lng: -46.6333, tz: -3 },
  { id: 'dubai', zh: '迪拜', en: 'Dubai', lat: 25.2048, lng: 55.2708, tz: 4 },
  { id: 'delhi', zh: '新德里', en: 'New Delhi', lat: 28.6139, lng: 77.209, tz: 5.5 },
]

export const ALL_CITIES = [...CITIES, ...CITIES_WORLD]

export function findCity(id: string): City | undefined {
  return ALL_CITIES.find(c => c.id === id)
}
