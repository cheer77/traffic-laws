export const ASSET_CATEGORIES = [
  "vehicles",
  "characters",
  "buildings",
  "traffic-signs",
  "traffic-lights",
  "intersections",
  "vegetation",
  "street-furniture",
] as const;
export type AssetCategory = (typeof ASSET_CATEGORIES)[number];
export interface AssetDefinition {
  id: string;
  name: string;
  category: AssetCategory;
  description: string;
  source: string;
}
export const ASSET_DEFINITIONS = [
  {
    id: "vehicle.sedan.standard",
    name: "Легковий автомобіль",
    category: "vehicles",
    description: "Процедурний седан",
    source: "vehicles/vehicleAssets.ts",
  },
  {
    id: "vehicle.suv.standard",
    name: "Позашляховик",
    category: "vehicles",
    description: "Процедурний SUV",
    source: "vehicles/vehicleAssets.ts",
  },
  {
    id: "vehicle.motorcycle.standard",
    name: "Мотоцикл із водієм",
    category: "vehicles",
    description: "Мотоцикл і статичний водій",
    source: "vehicles/vehicleAssets.ts",
  },
  {
    id: "vehicle.ambulance.ua",
    name: "Швидка допомога",
    category: "vehicles",
    description: "Наявна стилізована модель; ліврея не є нормативним еталоном",
    source: "vehicles/vehicleAssets.ts",
  },
  {
    id: "vehicle.police.ua",
    name: "Поліція",
    category: "vehicles",
    description: "Наявна стилізована модель; ліврея не є нормативним еталоном",
    source: "vehicles/vehicleAssets.ts",
  },
  {
    id: "vehicle.fire-truck.ua",
    name: "Пожежний автомобіль",
    category: "vehicles",
    description: "Наявна стилізована модель; ліврея не є нормативним еталоном",
    source: "vehicles/vehicleAssets.ts",
  },
  {
    id: "character.man",
    name: "Чоловік",
    category: "characters",
    description: "Статичний персонаж",
    source: "characters/Characters.tsx",
  },
  {
    id: "character.woman",
    name: "Жінка",
    category: "characters",
    description: "Статичний персонаж",
    source: "characters/Characters.tsx",
  },
  {
    id: "character.senior",
    name: "Літня людина",
    category: "characters",
    description: "Статичний персонаж із тростиною",
    source: "characters/Characters.tsx",
  },
  {
    id: "character.youth",
    name: "Юнак",
    category: "characters",
    description: "Статичний персонаж із рюкзаком",
    source: "characters/Characters.tsx",
  },
  {
    id: "building.home",
    name: "Житловий будинок",
    category: "buildings",
    description: "Будинок із балконами",
    source: "environment/CityEnvironment.tsx",
  },
  {
    id: "building.office",
    name: "Офіс",
    category: "buildings",
    description: "Офісна будівля",
    source: "environment/CityEnvironment.tsx",
  },
  {
    id: "building.shop",
    name: "Крамниця",
    category: "buildings",
    description: "Будівля з вітринами",
    source: "environment/CityEnvironment.tsx",
  },
  {
    id: "building.town",
    name: "Міський будинок",
    category: "buildings",
    description: "Будинок зі скатним дахом",
    source: "environment/CityEnvironment.tsx",
  },
  {
    id: "sign.priority.yield.ua",
    name: "Дати дорогу",
    category: "traffic-signs",
    description: "Знак на стійці, без юридичної логіки",
    source: "signs/signAssets.ts",
  },
  {
    id: "sign.priority.main.ua",
    name: "Головна дорога",
    category: "traffic-signs",
    description: "Знак на стійці, без юридичної логіки",
    source: "signs/signAssets.ts",
  },
  {
    id: "sign.priority.stop.ua",
    name: "STOP",
    category: "traffic-signs",
    description: "Знак на стійці, без юридичної логіки",
    source: "signs/signAssets.ts",
  },
  {
    id: "traffic-light.standard",
    name: "Світлофор",
    category: "traffic-lights",
    description: "Три секції; сигнал задає споживач",
    source: "traffic-lights/TrafficLight.tsx",
  },
  {
    id: "intersection.city.standard",
    name: "Міське перехрестя",
    category: "intersections",
    description: "Наявний комплект дороги й розмітки",
    source: "roads/IntersectionRoad.tsx",
  },
  {
    id: "vegetation.city.collection",
    name: "Озеленення",
    category: "vegetation",
    description: "Наявний instanced-комплект дерев і кущів з фіксованим розташуванням",
    source: "environment/CityEnvironment.tsx",
  },
  {
    id: "street-furniture.city.collection",
    name: "Міські меблі",
    category: "street-furniture",
    description: "Наявний комплект лавок і ліхтарів з фіксованим розташуванням",
    source: "environment/CityEnvironment.tsx",
  },
] as const satisfies readonly AssetDefinition[];
export type AssetId = (typeof ASSET_DEFINITIONS)[number]["id"];
