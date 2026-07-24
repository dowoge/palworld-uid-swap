// palsav.js — read-path port of the PalworldSaveTools (palsav) Python parser.
//
// Purpose: locate every 16-byte GUID slot in a decompressed GVAS save so that
// player UIDs can be patched IN PLACE. No re-serialization: bytes outside GUID
// slots are never touched.
//
// Ported faithfully from src/palsav/palsav/{archive.py, gvas.py, paltypes.py,
// compressor/*} and rawdata/{common,character,group,map_model,
// map_concrete_model,map_concrete_model_module,character_container,work,
// map_object}.py (DECODE side only).
//
// Self-contained ES module, no external dependencies. Works in Node and the
// browser. Compression/decompression is delegated to an injected `codec`
// object so this module stays dependency-free.

/* eslint-disable no-bitwise */

// ---------------------------------------------------------------------------
// UUID <-> bytes (exact byte order from archive.py UUID class)
// ---------------------------------------------------------------------------
//
// archive.py UUID.from_str: b = uuid.UUID(s).bytes  (standard RFC order)
//   raw = [b3,b2,b1,b0, b7,b6,b5,b4, b11,b10,b9,b8, b15,b14,b13,b12]
// __str__ reverses this. The permutation is its own inverse.
const UUID_PERM = [3, 2, 1, 0, 7, 6, 5, 4, 11, 10, 9, 8, 15, 14, 13, 12];
const HEX = [];
for (let i = 0; i < 256; i++) HEX[i] = i.toString(16).padStart(2, '0');

/**
 * Read the 16 raw bytes at u8[off..off+16] and format the dashed lowercase
 * UUID string exactly as archive.py's UUID.__str__ would.
 * @param {Uint8Array} u8
 * @param {number} off
 * @returns {string}
 */
export function bytesToUuid(u8, off) {
  // std[j] = raw[perm[j]]
  const s = new Array(16);
  for (let j = 0; j < 16; j++) s[j] = HEX[u8[off + UUID_PERM[j]]];
  return (
    s[0] + s[1] + s[2] + s[3] + '-' +
    s[4] + s[5] + '-' +
    s[6] + s[7] + '-' +
    s[8] + s[9] + '-' +
    s[10] + s[11] + s[12] + s[13] + s[14] + s[15]
  );
}

/**
 * Convert a dashed UUID string into the 16 raw bytes as stored on disk
 * (archive.py UUID.from_str byte order).
 * @param {string} str
 * @returns {Uint8Array}
 */
export function uuidToBytes(str) {
  const hex = str.replace(/-/g, '');
  if (hex.length !== 32) throw new Error(`invalid uuid string: ${str}`);
  const std = new Uint8Array(16);
  for (let i = 0; i < 16; i++) std[i] = parseInt(hex.substr(i * 2, 2), 16);
  const raw = new Uint8Array(16);
  for (let i = 0; i < 16; i++) raw[i] = std[UUID_PERM[i]];
  return raw;
}

// ---------------------------------------------------------------------------
// paltypes.py: PALWORLD_TYPE_HINTS (verbatim)
// ---------------------------------------------------------------------------
const PALWORLD_TYPE_HINTS = {
  '.worldSaveData.CharacterContainerSaveData.Key': 'StructProperty',
  '.worldSaveData.CharacterSaveParameterMap.Key': 'StructProperty',
  '.worldSaveData.CharacterSaveParameterMap.Value': 'StructProperty',
  '.worldSaveData.FoliageGridSaveDataMap.Key': 'StructProperty',
  '.worldSaveData.FoliageGridSaveDataMap.Value.ModelMap.Value': 'StructProperty',
  '.worldSaveData.FoliageGridSaveDataMap.Value.ModelMap.Value.InstanceDataMap.Key': 'StructProperty',
  '.worldSaveData.FoliageGridSaveDataMap.Value.ModelMap.Value.InstanceDataMap.Value': 'StructProperty',
  '.worldSaveData.FoliageGridSaveDataMap.Value': 'StructProperty',
  '.worldSaveData.ItemContainerSaveData.Key': 'StructProperty',
  '.worldSaveData.MapObjectSaveData.MapObjectSaveData.ConcreteModel.ModuleMap.Value': 'StructProperty',
  '.worldSaveData.MapObjectSaveData.MapObjectSaveData.Model.EffectMap.Value': 'StructProperty',
  '.worldSaveData.MapObjectSpawnerInStageSaveData.Key': 'StructProperty',
  '.worldSaveData.MapObjectSpawnerInStageSaveData.Value': 'StructProperty',
  '.worldSaveData.MapObjectSpawnerInStageSaveData.Value.SpawnerDataMapByLevelObjectInstanceId.Key': 'Guid',
  '.worldSaveData.MapObjectSpawnerInStageSaveData.Value.SpawnerDataMapByLevelObjectInstanceId.Value': 'StructProperty',
  '.worldSaveData.MapObjectSpawnerInStageSaveData.Value.SpawnerDataMapByLevelObjectInstanceId.Value.ItemMap.Value': 'StructProperty',
  '.worldSaveData.WorkSaveData.WorkSaveData.WorkAssignMap.Value': 'StructProperty',
  '.worldSaveData.BaseCampSaveData.Key': 'Guid',
  '.worldSaveData.BaseCampSaveData.Value': 'StructProperty',
  '.worldSaveData.BaseCampSaveData.Value.ModuleMap.Value': 'StructProperty',
  '.worldSaveData.ItemContainerSaveData.Value': 'StructProperty',
  '.worldSaveData.CharacterContainerSaveData.Value': 'StructProperty',
  '.worldSaveData.GroupSaveDataMap.Key': 'Guid',
  '.worldSaveData.GroupSaveDataMap.Value': 'StructProperty',
  '.worldSaveData.EnemyCampSaveData.EnemyCampStatusMap.Value': 'StructProperty',
  '.worldSaveData.DungeonSaveData.DungeonSaveData.MapObjectSaveData.MapObjectSaveData.Model.EffectMap.Value': 'StructProperty',
  '.worldSaveData.DungeonSaveData.DungeonSaveData.MapObjectSaveData.MapObjectSaveData.ConcreteModel.ModuleMap.Value': 'StructProperty',
  '.worldSaveData.InvaderSaveData.Key': 'Guid',
  '.worldSaveData.InvaderSaveData.Value': 'StructProperty',
  '.worldSaveData.OilrigSaveData.OilrigMap.Value': 'StructProperty',
  '.worldSaveData.SupplySaveData.SupplyInfos.Key': 'Guid',
  '.worldSaveData.SupplySaveData.SupplyInfos.Value': 'StructProperty',
  '.worldSaveData.GuildExtraSaveDataMap.Key': 'Guid',
  '.worldSaveData.GuildExtraSaveDataMap.Value': 'StructProperty',
  '.worldSaveData.EnemyCampSaveData.EnemyCampStatusMap.Value.TreasureBoxInfoMapBySpawnerName.Value': 'StructProperty',
  '.worldSaveData.DungeonSaveData.DungeonSaveData.RewardSaveDataMap.Key': 'Guid',
  '.worldSaveData.DungeonSaveData.DungeonSaveData.RewardSaveDataMap.Value': 'StructProperty',
  '.SaveData.Local_MaxFriendshipPalIds.Key': 'StructProperty',
  '.worldSaveData.InvaderDeclarationSaveData.ValidatedStartPointIds.StructProperty': 'Guid',
  '.SaveData.Local_MaxFriendshipPalIds.Value': 'StructProperty',
};

// rawdata/map_concrete_model.py MAP_OBJECT_NAME_TO_CONCRETE_MODEL_CLASS
// (824 entries, extracted verbatim).
const MAP_OBJECT_NAME_TO_CONCRETE_MODEL_CLASS = {"droppedcharacter":"PalMapObjectDeathDroppedCharacterModel","blastfurnace":"PalMapObjectConvertItemModel","blastfurnace2":"PalMapObjectConvertItemModel","blastfurnace3":"PalMapObjectConvertItemModel","blastfurnace4":"PalMapObjectConvertItemModel","blastfurnace5":"PalMapObjectConvertItemModel","campfire":"PalMapObjectConvertItemModel","characterrankup":"PalMapObjectRankUpCharacterModel","commondropitem3d":"PalMapObjectDropItemModel","commondropitem3d_sk":"PalMapObjectDropItemModel","cookingstove":"PalMapObjectConvertItemModel","damagablerock_pv":"PalMapObjectItemDropOnDamagModel","damagablerock0001":"PalMapObjectItemDropOnDamagModel","damagablerock0002":"PalMapObjectItemDropOnDamagModel","damagablerock0003":"PalMapObjectItemDropOnDamagModel","damagablerock0004":"PalMapObjectItemDropOnDamagModel","damagablerock0005":"PalMapObjectItemDropOnDamagModel","damagablerock0017":"PalMapObjectItemDropOnDamagModel","damagablerock0006":"PalMapObjectItemDropOnDamagModel","damagablerock0007":"PalMapObjectItemDropOnDamagModel","damagablerock0008":"PalMapObjectItemDropOnDamagModel","damagablerock0009":"PalMapObjectItemDropOnDamagModel","damagablerock0010":"PalMapObjectItemDropOnDamagModel","damagablerock0011":"PalMapObjectItemDropOnDamagModel","damagablerock0012":"PalMapObjectItemDropOnDamagModel","damagablerock0013":"PalMapObjectItemDropOnDamagModel","damagablerock0014":"PalMapObjectItemDropOnDamagModel","damagablerock0015":"PalMapObjectItemDropOnDamagModel","damagablerock0016":"PalMapObjectItemDropOnDamagModel","deathpenaltychest":"PalMapObjectDeathPenaltyStorageModel","defensegatlinggun":"PalMapObjectDefenseBulletLauncherModel","defensemachinegun":"PalMapObjectDefenseBulletLauncherModel","defenseminigun":"DEFAULT_UNKNOWN_PalMapObjectConcreteModelBase","defensebowgun":"PalMapObjectDefenseBulletLauncherModel","defensemissile":"PalMapObjectDefenseBulletLauncherModel","defensewait":"PalMapObjectDefenseWaitModel","electricgenerator":"PalMapObjectGenerateEnergyModel","electricgenerator_slave":"PalMapObjectGenerateEnergyModel","electricgenerator2":"PalMapObjectGenerateEnergyModel","electricgenerator3":"PalMapObjectGenerateEnergyModel","electrickitchen":"PalMapObjectConvertItemModel","hugekitchen":"PalMapObjectConvertItemModel","factory_comfortable_01":"PalMapObjectConvertItemModel","factory_comfortable_02":"PalMapObjectConvertItemModel","factory_hard_01":"PalMapObjectConvertItemModel","factory_hard_02":"PalMapObjectConvertItemModel","factory_hard_03":"PalMapObjectConvertItemModel","factory_hard_04":"PalMapObjectConvertItemModel","farmblockv2_grade01":"PalMapObjectFarmBlockV2Model","farmblockv2_grade02":"PalMapObjectFarmBlockV2Model","farmblockv2_grade03":"PalMapObjectFarmBlockV2Model","farmblockv2_wheet":"PalMapObjectFarmBlockV2Model","farmblockv2_tomato":"PalMapObjectFarmBlockV2Model","farmblockv2_lettuce":"PalMapObjectFarmBlockV2Model","farmblockv2_berries":"PalMapObjectFarmBlockV2Model","fasttravelpoint":"PalMapObjectFastTravelPointModel","hightechkitchen":"PalMapObjectConvertItemModel","itemchest":"PalMapObjectItemChestModel","itemchest_02":"PalMapObjectItemChestModel","itemchest_03":"PalMapObjectItemChestModel","dev_itemchest":"PalMapObjectItemChestModel","medicalpalbed":"PalMapObjectMedicalPalBedModel","medicalpalbed_02":"PalMapObjectMedicalPalBedModel","medicalpalbed_03":"PalMapObjectMedicalPalBedModel","medicalpalbed_04":"PalMapObjectMedicalPalBedModel","medicinefacility_01":"PalMapObjectConvertItemModel","medicinefacility_02":"PalMapObjectConvertItemModel","medicinefacility_03":"PalMapObjectConvertItemModel","palfoodbox":"PalMapObjectPalFoodBoxModel","palboxv2":"PalMapObjectBaseCampPoint","displaycharacter":"PalMapObjectDisplayCharacterModel","pickupitem_flint":"PalMapObjectPickupItemOnLevelModel","pickupitem_log":"PalMapObjectPickupItemOnLevelModel","pickupitem_redberry":"PalMapObjectPickupItemOnLevelModel","pickupitem_stone":"PalMapObjectPickupItemOnLevelModel","pickupitem_potato":"PalMapObjectPickupItemOnLevelModel","pickupitem_poppy":"PalMapObjectPickupItemOnLevelModel","pickupitem_nightstone":"PalMapObjectPickupItemOnLevelModel","pickupitem_yakushimamushroom_01":"PalMapObjectPickupItemOnLevelModel","pickupitem_yakushimamushroom_02":"PalMapObjectPickupItemOnLevelModel","pickupitem_yakushimamushroom_03":"PalMapObjectPickupItemOnLevelModel","playerbed":"PalMapObjectPlayerBedModel","playerbed_02":"PalMapObjectPlayerBedModel","playerbed_03":"PalMapObjectPlayerBedModel","shippingitembox":"PalMapObjectShippingItemModel","spherefactory_black_01":"PalMapObjectConvertItemModel","spherefactory_black_02":"PalMapObjectConvertItemModel","spherefactory_black_03":"PalMapObjectConvertItemModel","spherefactory_black_04":"PalMapObjectConvertItemModel","spherefactory_white_01":"PalMapObjectConvertItemModel","spherefactory_white_02":"PalMapObjectConvertItemModel","spherefactory_white_03":"PalMapObjectConvertItemModel","stonehouse1":"PalBuildObject","stonepit":"PalMapObjectProductItemModel","strawhouse1":"PalBuildObject","weaponfactory_clean_01":"PalMapObjectConvertItemModel","weaponfactory_clean_02":"PalMapObjectConvertItemModel","weaponfactory_clean_03":"PalMapObjectConvertItemModel","weaponfactory_dirty_01":"PalMapObjectConvertItemModel","weaponfactory_dirty_02":"PalMapObjectConvertItemModel","weaponfactory_dirty_03":"PalMapObjectConvertItemModel","weaponfactory_dirty_04":"PalMapObjectConvertItemModel","well":"PalMapObjectProductItemModel","woodhouse1":"PalBuildObject","workbench":"PalMapObjectConvertItemModel","recoverotomo":"PalMapObjectRecoverOtomoModel","palegg":"PalMapObjectPalEggModel","palegg_fire":"PalMapObjectPalEggModel","palegg_water":"PalMapObjectPalEggModel","palegg_leaf":"PalMapObjectPalEggModel","palegg_electricity":"PalMapObjectPalEggModel","palegg_ice":"PalMapObjectPalEggModel","palegg_earth":"PalMapObjectPalEggModel","palegg_dark":"PalMapObjectPalEggModel","palegg_dragon":"PalMapObjectPalEggModel","hatchingpalegg":"PalMapObjectHatchingEggModel","treasurebox":"PalMapObjectTreasureBoxModel","treasurebox_visiblecontent":"PalMapObjectPickupItemOnLevelModel","treasurebox_visiblecontent_skillfruits":"PalMapObjectPickupItemOnLevelModel","stationdeforest2":"PalMapObjectProductItemModel","workbench_skillunlock":"PalMapObjectConvertItemModel","workbench_skillcard":"PalMapObjectConvertItemModel","wooden_foundation":"PalBuildObject","wooden_wall":"PalBuildObject","wooden_roof":"PalBuildObject","wooden_stair":"PalBuildObject","wooden_doorwall":"PalMapObjectDoorModel","stone_foundation":"PalBuildObject","stone_wall":"PalBuildObject","stone_roof":"PalBuildObject","stone_stair":"PalBuildObject","stone_doorwall":"PalMapObjectDoorModel","metal_foundation":"PalBuildObject","metal_wall":"PalBuildObject","metal_roof":"PalBuildObject","metal_stair":"PalBuildObject","metal_doorwall":"PalMapObjectDoorModel","buildablegoddessstatue":"PalMapObjectCharacterStatusOperatorModel","spa":"PalMapObjectAmusementModel","spa2":"PalMapObjectAmusementModel","pickupitem_mushroom":"PalMapObjectPickupItemOnLevelModel","defensewall_wood":"PalBuildObject","defensewall":"PalBuildObject","defensewall_metal":"PalBuildObject","heater":"PalMapObjectHeatSourceModel","electricheater":"PalMapObjectHeatSourceModel","cooler":"PalMapObjectHeatSourceModel","electriccooler":"PalMapObjectHeatSourceModel","torch":"PalMapObjectTorchModel","walltorch":"PalMapObjectTorchModel","lamp":"PalMapObjectLampModel","ceilinglamp":"PalMapObjectLampModel","largelamp":"PalMapObjectLampModel","largeceilinglamp":"PalMapObjectLampModel","crusher":"PalMapObjectConvertItemModel","woodcrusher":"PalMapObjectConvertItemModel","flourmill":"PalMapObjectConvertItemModel","trap_leghold":"DEFAULT_UNKNOWN_PalMapObjectConcreteModelBase","trap_leghold_big":"DEFAULT_UNKNOWN_PalMapObjectConcreteModelBase","trap_noose":"DEFAULT_UNKNOWN_PalMapObjectConcreteModelBase","trap_movingpanel":"DEFAULT_UNKNOWN_PalMapObjectConcreteModelBase","trap_mineelecshock":"DEFAULT_UNKNOWN_PalMapObjectConcreteModelBase","trap_minefreeze":"DEFAULT_UNKNOWN_PalMapObjectConcreteModelBase","trap_mineattack":"DEFAULT_UNKNOWN_PalMapObjectConcreteModelBase","breedfarm":"PalMapObjectBreedFarmModel","wood_gate":"PalMapObjectDoorModel","stone_gate":"PalMapObjectDoorModel","metal_gate":"PalMapObjectDoorModel","repairbench":"PalMapObjectRepairItemModel","skillfruit_test":"PalMapObjectPickupItemOnLevelModel","toolboxv1":"PalMapObjectBaseCampPassiveEffectModel","toolboxv2":"PalMapObjectBaseCampPassiveEffectModel","fountain":"PalMapObjectBaseCampPassiveEffectModel","silo":"PalMapObjectBaseCampPassiveEffectModel","transmissiontower":"PalMapObjectBaseCampPassiveEffectModel","flowerbed":"PalMapObjectBaseCampPassiveEffectModel","stump":"PalMapObjectBaseCampPassiveEffectModel","miningtool":"PalMapObjectBaseCampPassiveEffectModel","cauldron":"PalMapObjectBaseCampPassiveEffectModel","snowman":"PalMapObjectBaseCampPassiveEffectModel","olympiccauldron":"PalMapObjectBaseCampPassiveEffectModel","basecampworkhard":"PalMapObjectBaseCampPassiveWorkHardModel","coolerbox":"PalMapObjectItemChest_AffectCorruption","refrigerator":"PalMapObjectItemChest_AffectCorruption","damagedscarecrow":"PalMapObjectDamagedScarecrowModel","signboard":"PalMapObjectSignboardModel","basecampbattledirector":"PalMapObjectBaseCampWorkerDirectorModel","monsterfarm":"PalMapObjectMonsterFarmModel","wood_windowwall":"PalBuildObject","stone_windowwall":"PalBuildObject","metal_windowwall":"PalBuildObject","wood_trianglewall":"PalBuildObject","stone_trianglewall":"PalBuildObject","metal_trianglewall":"PalBuildObject","wood_slantedroof":"PalBuildObject","stone_slantedroof":"PalBuildObject","metal_slantedroof":"PalBuildObject","table1":"PalBuildObject","barrel_wood":"PalMapObjectItemChestModel","box_wood":"PalMapObjectItemChestModel","box01_iron":"PalMapObjectItemChestModel","box02_iron":"PalMapObjectItemChestModel","shelf_wood":"PalMapObjectItemChestModel","shelf_cask_wood":"PalMapObjectItemChestModel","shelf_hang01_wood":"PalMapObjectItemChestModel","shelf01_iron":"PalMapObjectItemChestModel","shelf02_iron":"PalMapObjectItemChestModel","shelf03_iron":"PalMapObjectItemChestModel","shelf04_iron":"PalMapObjectItemChestModel","shelf05_stone":"PalMapObjectItemChestModel","shelf06_stone":"PalMapObjectItemChestModel","shelf07_stone":"PalMapObjectItemChestModel","shelf01_wall_stone":"PalMapObjectItemChestModel","shelf01_wall_iron":"PalMapObjectItemChestModel","shelf01_stone":"PalMapObjectItemChestModel","shelf02_stone":"PalMapObjectItemChestModel","shelf03_stone":"PalMapObjectItemChestModel","shelf04_stone":"PalMapObjectItemChestModel","container01_iron":"PalMapObjectItemChestModel","tablesquare_wood":"PalBuildObject","tablecircular_wood":"PalBuildObject","bench_wood":"PalMapObjectPlayerSitModel","stool_wood":"PalMapObjectPlayerSitModel","decal_palsticker_pinkcat":"PalBuildObject","stool_high_wood":"PalMapObjectPlayerSitModel","counter_wood":"PalBuildObject","rug_wood":"PalBuildObject","shelf_hang02_wood":"PalBuildObject","ivy01":"PalBuildObject","ivy02":"PalBuildObject","ivy03":"PalBuildObject","chair01_wood":"PalMapObjectPlayerSitModel","box01_stone":"PalBuildObject","barrel01_iron":"PalBuildObject","barrel02_iron":"PalBuildObject","barrel03_iron":"PalBuildObject","cablecoil01_iron":"PalBuildObject","chair01_iron":"PalMapObjectPlayerSitModel","chair02_iron":"PalMapObjectPlayerSitModel","clock01_wall_iron":"PalBuildObject","garbagebag_iron":"PalBuildObject","goalsoccer_iron":"PalBuildObject","machinegame01_iron":"PalBuildObject","machinevending01_iron":"PalBuildObject","pipeclay01_iron":"PalBuildObject","signexit_ceiling_iron":"PalBuildObject","signexit_wall_iron":"PalBuildObject","sofa01_iron":"PalMapObjectPlayerSitModel","sofa02_iron":"PalMapObjectPlayerSitModel","stool01_iron":"PalMapObjectPlayerSitModel","tablecircular01_iron":"PalBuildObject","tableside01_iron":"PalBuildObject","tablesquare01_iron":"PalBuildObject","tablesquare02_iron":"PalBuildObject","tire01_iron":"PalBuildObject","trafficbarricade01_iron":"PalBuildObject","trafficbarricade02_iron":"PalBuildObject","trafficbarricade03_iron":"PalBuildObject","trafficbarricade04_iron":"PalBuildObject","trafficbarricade05_iron":"PalBuildObject","trafficcone01_iron":"PalBuildObject","trafficcone02_iron":"PalBuildObject","trafficcone03_iron":"PalBuildObject","trafficlight01_iron":"PalBuildObject","bathtub_stone":"PalBuildObject","chair01_stone":"PalMapObjectPlayerSitModel","chair02_stone":"PalMapObjectPlayerSitModel","clock01_stone":"PalBuildObject","curtain01_wall_stone":"PalBuildObject","desk01_stone":"PalBuildObject","globe01_stone":"PalBuildObject","mirror01_stone":"PalBuildObject","mirror02_stone":"PalBuildObject","mirror01_wall_stone":"PalBuildObject","partition_stone":"PalBuildObject","piano01_stone":"PalBuildObject","piano02_stone":"PalBuildObject","rug01_stone":"PalBuildObject","rug02_stone":"PalBuildObject","rug03_stone":"PalBuildObject","rug04_stone":"PalBuildObject","sofa01_stone":"PalMapObjectPlayerSitModel","sofa02_stone":"PalMapObjectPlayerSitModel","sofa03_stone":"PalBuildObject","stool01_stone":"PalMapObjectPlayerSitModel","stove01_stone":"PalBuildObject","tablecircular01_stone":"PalBuildObject","tabledresser01_stone":"PalMapObjectCharacterMakeModel","tablesink01_stone":"PalBuildObject","toilet01_stone":"PalMapObjectPlayerSitModel","toiletholder01_stone":"PalBuildObject","towlrack01_stone":"PalBuildObject","plant01_plant":"PalBuildObject","plant02_plant":"PalBuildObject","plant03_plant":"PalBuildObject","plant04_plant":"PalBuildObject","light_floorlamp01":"PalMapObjectLampModel","light_floorlamp02":"PalMapObjectLampModel","light_lightpole01":"PalMapObjectLampModel","light_lightpole02":"PalMapObjectLampModel","light_lightpole03":"PalMapObjectLampModel","light_lightpole04":"PalMapObjectLampModel","light_fireplace01":"PalMapObjectTorchModel","light_fireplace02":"PalMapObjectTorchModel","light_candlesticks_top":"PalMapObjectLampModel","light_candlesticks_wall":"PalMapObjectLampModel","television01_iron":"PalBuildObject","desk01_iron":"PalBuildObject","trafficsign01_iron":"PalBuildObject","trafficsign02_iron":"PalBuildObject","trafficsign03_iron":"PalBuildObject","trafficsign04_iron":"PalBuildObject","chair01_pal":"PalMapObjectPlayerSitModel","altar":"PalBuildObjectRaidBossSummon","copperpit":"PalMapObjectProductItemModel","copperpit_2":"PalMapObjectProductItemModel","electrichatchingpalegg":"PalMapObjectHatchingEggModel","pickupitem_cavemushroom":"PalMapObjectPickupItemOnLevelModel","coolerpalfoodbox":"PalMapObjectPalFoodBoxModel","treasurebox_oilrig":"PalMapObjectTreasureBoxModel","sulfurpit":"PalMapObjectProductItemModel","coalpit":"PalMapObjectProductItemModel","icecrusher":"PalMapObjectConvertItemModel","dismantlingconveyor":"PalBuildObjectConvertCharacterToItem","wallsignboard":"PalMapObjectSignboardModel","treasurebox_electric":"PalMapObjectTreasureBoxModel","treasurebox_fire":"PalMapObjectTreasureBoxModel","treasurebox_water":"PalMapObjectTreasureBoxModel","glass_foundation":"PalBuildObject","glass_wall":"PalBuildObject","glass_roof":"PalBuildObject","glass_stair":"PalBuildObject","glass_doorwall":"PalMapObjectDoorModel","glass_trianglewall":"PalBuildObject","glass_slantedroof":"PalBuildObject","glass_windowwall":"PalBuildObject","wooden_pillar":"PalBuildObject","stone_pillar":"PalBuildObject","metal_pillars":"PalBuildObject","glass_pillars":"PalBuildObject","meteordrop_pickup":"PalMapObjectPickupItemOnLevelModel","supplydrop":"PalMapObjectSupplyStorageModel","meteordrop_damagable":"PalMapObjectItemDropOnDamagModel","electricgenerator_large":"PalMapObjectGenerateEnergyModel","treasurebox_requiredlonghold":"PalMapObjectTreasureBoxModel","oilpump":"PalMapObjectProductItemModel","pickupitem_lotus_attack_01":"PalMapObjectPickupItemOnLevelModel","pickupitem_lotus_attack_02":"PalMapObjectPickupItemOnLevelModel","pickupitem_lotus_hp_01":"PalMapObjectPickupItemOnLevelModel","pickupitem_lotus_hp_02":"PalMapObjectPickupItemOnLevelModel","pickupitem_lotus_stamina_01":"PalMapObjectPickupItemOnLevelModel","pickupitem_lotus_stamina_02":"PalMapObjectPickupItemOnLevelModel","pickupitem_lotus_workspeed_01":"PalMapObjectPickupItemOnLevelModel","pickupitem_lotus_workspeed_02":"PalMapObjectPickupItemOnLevelModel","pickupitem_lotus_weight_01":"PalMapObjectPickupItemOnLevelModel","pickupitem_lotus_weight_02":"PalMapObjectPickupItemOnLevelModel","skinchange":"PalMapObjectSkinChangeModel","pickupitem_dogcoin":"PalMapObjectPickupItemOnLevelModel","japanesestyle_wall_01":"PalBuildObject","japanesestyle_doorwall_01":"PalMapObjectDoorModel","japanesestyle_doorwall_02":"PalMapObjectDoorModel","japanesestyle_roof_01":"PalBuildObject","japanesestyle_roof_02":"PalBuildObject","japanesestyle_slantedroof":"PalBuildObject","japanesestyle_trianglewall":"PalBuildObject","japanesestyle_windowwall":"PalBuildObject","japanesestyle_foundation":"PalBuildObject","japanesestyle_stair":"PalBuildObject","japanesestyle_pillar":"PalBuildObject","sanitydecrease1":"PalMapObjectBaseCampPassiveEffectModel","workspeedincrease1":"PalMapObjectBaseCampPassiveEffectModel","quartzpit":"PalMapObjectProductItemModel","factory_money":"PalMapObjectConvertItemModel","itemchest_04":"PalMapObjectItemChestModel","medicalpalbed_05":"PalMapObjectMedicalPalBedModel","farmblockv2_carrot":"PalMapObjectFarmBlockV2Model","farmblockv2_onion":"PalMapObjectFarmBlockV2Model","farmblockv2_potato":"PalMapObjectFarmBlockV2Model","basecampitemdispenser":"PalMapObjectBaseCampItemDispenserModel","guildchest":"PalMapObjectGuildChestModel","woodcreator":"PalMapObjectProductItemModel","expedition":"PalMapObjectCharacterTeamMissionModel","itembooth":"PalMapObjectItemBoothModel","lab":"PalMapObjectLabModel","palbooth":"PalMapObjectPalBoothModel","multielectrichatchingpalegg":"PalMapObjectMultiHatchingEggModel","operatingtable":"PalMapObjectOperatingTableModel","manualelectricgenerator":"PalMapObjectGenerateEnergyModel","farm_skillfruits":"PalMapObjectFarmSkillFruitsModel","wooden_ladder":"PalBuildObject","palmedicinebox":"PalMapObjectPalMedicineBoxModel","energystorage_electric":"PalMapObjectEnergyStorageModel","damagablerock0018":"PalMapObjectItemDropOnDamagModel","headstone":"PalMapObjectSignboardModel","japanesestyle_doorwall_03":"PalMapObjectDoorModel","damagablerock0019":"PalMapObjectItemDropOnDamagModel","byobu":"PalBuildObject","kakejiku":"PalBuildObject","zaisu":"PalMapObjectPlayerSitModel","zabuton":"PalMapObjectPlayerSitModel","irori":"PalBuildObject","toro":"PalBuildObject","andon":"PalBuildObject","shishiodoshi":"PalBuildObject","bonsai":"PalBuildObject","koro":"PalBuildObject","seika":"PalBuildObject","tansu":"PalMapObjectItemChestModel","fudukue":"PalBuildObject","compositedesk":"PalMapObjectConvertItemModel","globalpalstorage":"PalMapObjectGlobalPalStorageModel","dimensionpalstorage":"PalMapObjectDimensionPalStorageModel","wire_fence":"PalBuildObject","sf_foundation":"PalBuildObject","sf_wall":"PalBuildObject","sf_roof":"PalBuildObject","sf_stair":"PalBuildObject","sf_doorwall":"PalMapObjectDoorModel","sf_trianglewall":"PalBuildObject","sf_slantedroof":"PalBuildObject","sf_windowwall":"PalBuildObject","sf_pillars":"PalBuildObject","lilyqueenstatue":"PalBuildObject","conservationgroupbannera":"PalBuildObject","conservationgroupbannerb":"PalBuildObject","banyan_big":"PalBuildObject","hunter_gangflag":"PalBuildObject","palcage":"PalBuildObject","treasurebox_enemycampgoal":"PalMapObjectTreasureBoxModel","treasurebox_enemycamp":"PalMapObjectTreasureBoxModel","woodenbarricade":"PalBuildObject","walltorch02":"PalMapObjectTorchModel","candlestand":"PalMapObjectTorchModel","firestand":"PalMapObjectTorchModel","wood_fence":"PalBuildObject","stone_fence":"PalBuildObject","iron_fence":"PalBuildObject","glass_fence":"PalBuildObject","japanesestyle_fence":"PalBuildObject","sf_fence":"PalBuildObject","destroyablewall_rock01":"PalMapObjectItemDropOnDamagModel","destroyablewall_rock02":"PalMapObjectItemDropOnDamagModel","pickupitem_affectionfruit":"PalMapObjectPickupItemOnLevelModel","crystalpit":"PalMapObjectProductItemModel","spa3":"PalMapObjectAmusementModel","multihatchingpalegg":"PalMapObjectMultiHatchingEggModel","treasurebox_fishingjunk_requiredlonghold":"PalMapObjectTreasureBoxModel","treasurebox_fishingjunk_requiredlonghold2":"PalMapObjectTreasureBoxModel","fishingpond1":"PalMapObjectFishPondModel","fishingpond2":"PalMapObjectFishPondModel","basecampworkerextrastation":"PalMapObjectBaseCampWorkerExtraStationModel","sf_desk":"PalBuildObject","sf_chair":"PalMapObjectPlayerSitModel","damagabletree_yakushima001":"PalMapObjectItemDropOnDamagModel","damagabletree_yakushima002":"PalMapObjectItemDropOnDamagModel","damagabletree_yakushima003":"PalMapObjectItemDropOnDamagModel","lanterntop":"PalMapObjectLampModel","shrine_lantern":"PalMapObjectLampModel","guardiandogstatue":"PalBuildObject","yakushima_crystal":"PalMapObjectItemDropOnDamagModel","yakushima_pot":"PalMapObjectItemDropOnDamagModel","hunter_flag":"PalBuildObject","hunter_banner":"PalBuildObject","believer_flag":"PalBuildObject","believer_banner":"PalBuildObject","firecult_flag":"PalBuildObject","firecult_banner":"PalBuildObject","police_flag":"PalBuildObject","police_banner":"PalBuildObject","scientist_flag":"PalBuildObject","scientist_banner":"PalBuildObject","ninja_flag":"PalBuildObject","ninja_banner":"PalBuildObject","treasurebox_yakushima":"PalMapObjectTreasureBoxModel","yakushima_healheart":"PalMapObjectInstantEffectModel","enemycamp_wooden_foundation":"PalBuildObject","enemycamp_wooden_wall":"PalBuildObject","enemycamp_wood_windowwall":"PalBuildObject","enemycamp_wood_trianglewall":"PalBuildObject","enemycamp_wooden_roof":"PalBuildObject","enemycamp_wood_slantedroof":"PalBuildObject","enemycamp_wooden_stair":"PalBuildObject","enemycamp_wooden_doorwall":"PalMapObjectDoorModel","enemycamp_wooden_pillar":"PalBuildObject","enemycamp_defensewall_wood":"PalBuildObject","enemycamp_wood_gate":"PalMapObjectDoorModel","enemycamp_wooden_ladder":"PalBuildObject","enemycamp_stone_foundation":"PalBuildObject","enemycamp_stone_wall":"PalBuildObject","enemycamp_stone_windowwall":"PalBuildObject","enemycamp_stone_trianglewall":"PalBuildObject","enemycamp_stone_roof":"PalBuildObject","enemycamp_stone_slantedroof":"PalBuildObject","enemycamp_stone_stair":"PalBuildObject","enemycamp_stone_doorwall":"PalMapObjectDoorModel","enemycamp_stone_pillar":"PalBuildObject","enemycamp_defensewall":"PalBuildObject","enemycamp_stone_gate":"PalMapObjectDoorModel","enemycamp_metal_foundation":"PalBuildObject","enemycamp_metal_wall":"PalBuildObject","enemycamp_metal_windowwall":"PalBuildObject","enemycamp_metal_trianglewall":"PalBuildObject","enemycamp_metal_roof":"PalBuildObject","enemycamp_metal_slantedroof":"PalBuildObject","enemycamp_metal_stair":"PalBuildObject","enemycamp_metal_doorwall":"PalMapObjectDoorModel","enemycamp_metal_pillars":"PalBuildObject","enemycamp_defensewall_metal":"PalBuildObject","enemycamp_metal_gate":"PalMapObjectDoorModel","enemycamp_glass_foundation":"PalBuildObject","enemycamp_glass_wall":"PalBuildObject","enemycamp_glass_windowwall":"PalBuildObject","enemycamp_glass_trianglewall":"PalBuildObject","enemycamp_glass_roof":"PalBuildObject","enemycamp_glass_slantedroof":"PalBuildObject","enemycamp_glass_stair":"PalBuildObject","enemycamp_glass_doorwall":"PalMapObjectDoorModel","enemycamp_glass_pillars":"PalBuildObject","enemycamp_japanesestyle_foundation":"PalBuildObject","enemycamp_japanesestyle_wall_01":"PalBuildObject","enemycamp_japanesestyle_windowwall":"PalBuildObject","enemycamp_japanesestyle_trianglewall":"PalBuildObject","enemycamp_japanesestyle_roof_01":"PalBuildObject","enemycamp_japanesestyle_roof_02":"PalBuildObject","enemycamp_japanesestyle_slantedroof":"PalBuildObject","enemycamp_japanesestyle_stair":"PalBuildObject","enemycamp_japanesestyle_doorwall_01":"PalMapObjectDoorModel","enemycamp_japanesestyle_doorwall_02":"PalMapObjectDoorModel","enemycamp_japanesestyle_doorwall_03":"PalMapObjectDoorModel","enemycamp_japanesestyle_pillar":"PalBuildObject","enemycamp_wooden_wall_destructable":"PalBuildObject","enemycamp_stone_wall_destructable":"PalBuildObject","enemycamp_metal_wall_destructable":"PalBuildObject","enemycamp_glass_wall_destructable":"PalBuildObject","enemycamp_japanesestyle_wall_01_destructable":"PalBuildObject","enemycamp_sf_wall_destructable":"PalBuildObject","enemycamp_workbench":"PalBuildObject","enemycamp_repairbench":"PalBuildObject","enemycamp_workbench_skillunlock":"PalBuildObject","enemycamp_blastfurnace":"PalBuildObject","enemycamp_factory_hard_01":"PalBuildObject","enemycamp_medicinefacility_01":"PalBuildObject","enemycamp_weaponfactory_dirty_01":"PalBuildObject","enemycamp_weaponfactory_dirty_02":"PalBuildObject","enemycamp_blastfurnace2":"PalBuildObject","enemycamp_medicinefacility_02":"PalBuildObject","enemycamp_blastfurnace3":"PalBuildObject","enemycamp_oilpump":"PalBuildObject","enemycamp_blastfurnace4":"PalBuildObject","enemycamp_medicinefacility_03":"PalBuildObject","enemycamp_buildablegoddessstatue":"PalBuildObject","enemycamp_spherefactory_black_01":"PalBuildObject","enemycamp_characterrankup":"PalBuildObject","enemycamp_lab":"PalBuildObject","enemycamp_hatchingpalegg":"PalBuildObject","enemycamp_electrichatchingpalegg":"PalBuildObject","enemycamp_dismantlingconveyor":"PalBuildObject","enemycamp_multielectrichatchingpalegg":"PalBuildObject","enemycamp_spherefactory_black_04":"PalBuildObject","enemycamp_itemchest":"PalBuildObject","enemycamp_coolerbox":"PalBuildObject","enemycamp_itemchest_02":"PalBuildObject","enemycamp_refrigerator":"PalBuildObject","enemycamp_itemchest_03":"PalBuildObject","enemycamp_barrel_wood":"PalBuildObject","enemycamp_box_wood":"PalBuildObject","enemycamp_shelf_wood":"PalBuildObject","enemycamp_shelf_cask_wood":"PalBuildObject","enemycamp_shelf_hang01_wood":"PalBuildObject","enemycamp_shelf01_stone":"PalBuildObject","enemycamp_shelf02_stone":"PalBuildObject","enemycamp_shelf03_stone":"PalBuildObject","enemycamp_shelf04_stone":"PalBuildObject","enemycamp_shelf01_wall_iron":"PalBuildObject","enemycamp_shelf05_stone":"PalBuildObject","enemycamp_shelf06_stone":"PalBuildObject","enemycamp_shelf07_stone":"PalBuildObject","enemycamp_shelf01_wall_stone":"PalBuildObject","enemycamp_shelf01_iron":"PalBuildObject","enemycamp_shelf02_iron":"PalBuildObject","enemycamp_shelf03_iron":"PalBuildObject","enemycamp_shelf04_iron":"PalBuildObject","enemycamp_container01_iron":"PalBuildObject","enemycamp_box01_iron":"PalBuildObject","enemycamp_box02_iron":"PalBuildObject","enemycamp_basecampitemdispenser":"PalBuildObject","enemycamp_itemchest_04":"PalBuildObject","enemycamp_tansu":"PalBuildObject","enemycamp_campfire":"PalBuildObject","enemycamp_palfoodbox":"PalBuildObject","enemycamp_cookingstove":"PalBuildObject","enemycamp_electrickitchen":"PalBuildObject","enemycamp_farmblockv2_wheet":"PalBuildObject","enemycamp_hugekitchen":"PalBuildObject","enemycamp_playerbed_02":"PalBuildObject","enemycamp_medicalpalbed_02":"PalBuildObject","enemycamp_spa":"PalBuildObject","enemycamp_manualelectricgenerator":"PalBuildObject","enemycamp_heater":"PalBuildObject","enemycamp_cooler":"PalBuildObject","enemycamp_palmedicinebox":"PalBuildObject","enemycamp_medicalpalbed_03":"PalBuildObject","enemycamp_electricgenerator":"PalBuildObject","enemycamp_playerbed_03":"PalBuildObject","enemycamp_energystorage_electric":"PalBuildObject","enemycamp_sanitydecrease1":"PalBuildObject","enemycamp_electricheater":"PalBuildObject","enemycamp_electriccooler":"PalBuildObject","enemycamp_workspeedincrease1":"PalBuildObject","enemycamp_electricgenerator_large":"PalBuildObject","enemycamp_medicalpalbed_05":"PalBuildObject","enemycamp_torch":"PalBuildObject","enemycamp_walltorch":"PalBuildObject","enemycamp_lamp":"PalBuildObject","enemycamp_ceilinglamp":"PalBuildObject","enemycamp_largelamp":"PalBuildObject","enemycamp_largeceilinglamp":"PalBuildObject","enemycamp_light_fireplace01":"PalBuildObject","enemycamp_light_fireplace02":"PalBuildObject","enemycamp_light_lightpole01":"PalBuildObject","enemycamp_light_lightpole02":"PalBuildObject","enemycamp_light_lightpole03":"PalBuildObject","enemycamp_light_lightpole04":"PalBuildObject","enemycamp_light_floorlamp01":"PalBuildObject","enemycamp_light_floorlamp02":"PalBuildObject","enemycamp_light_candlesticks_top":"PalBuildObject","enemycamp_light_candlesticks_wall":"PalBuildObject","enemycamp_basecampbattledirector":"PalMapObjectBaseCampWorkerDirectorModel","enemycamp_trap_noose":"PalBuildObject","enemycamp_defensewait":"PalBuildObject","enemycamp_defensebowgun":"PalBuildObject","enemycamp_defensemachinegun":"PalBuildObject","enemycamp_defensemissile":"PalBuildObject","enemycamp_damagedscarecrow":"PalBuildObject","enemycamp_headstone":"PalBuildObject","enemycamp_fountain":"PalBuildObject","enemycamp_flowerbed":"PalBuildObject","enemycamp_silo":"PalBuildObject","enemycamp_stump":"PalBuildObject","enemycamp_cauldron":"PalBuildObject","enemycamp_tablesquare_wood":"PalBuildObject","enemycamp_tablecircular_wood":"PalBuildObject","enemycamp_bench_wood":"PalBuildObject","enemycamp_stool_wood":"PalBuildObject","enemycamp_stool_high_wood":"PalBuildObject","enemycamp_chair01_wood":"PalBuildObject","enemycamp_shelf_hang02_wood":"PalBuildObject","enemycamp_counter_wood":"PalBuildObject","enemycamp_plant01_plant":"PalBuildObject","enemycamp_plant02_plant":"PalBuildObject","enemycamp_plant03_plant":"PalBuildObject","enemycamp_plant04_plant":"PalBuildObject","enemycamp_ivy01":"PalBuildObject","enemycamp_ivy02":"PalBuildObject","enemycamp_ivy03":"PalBuildObject","enemycamp_rug01_stone":"PalBuildObject","enemycamp_rug02_stone":"PalBuildObject","enemycamp_rug03_stone":"PalBuildObject","enemycamp_rug04_stone":"PalBuildObject","enemycamp_chair01_stone":"PalBuildObject","enemycamp_chair02_stone":"PalBuildObject","enemycamp_stool01_stone":"PalBuildObject","enemycamp_desk01_stone":"PalBuildObject","enemycamp_tablecircular01_stone":"PalBuildObject","enemycamp_tabledresser01_stone":"PalBuildObject","enemycamp_sofa01_stone":"PalBuildObject","enemycamp_sofa02_stone":"PalBuildObject","enemycamp_sofa03_stone":"PalBuildObject","enemycamp_bathtub_stone":"PalBuildObject","enemycamp_box01_stone":"PalBuildObject","enemycamp_partition_stone":"PalBuildObject","enemycamp_towlrack01_stone":"PalBuildObject","enemycamp_mirror01_stone":"PalBuildObject","enemycamp_mirror02_stone":"PalBuildObject","enemycamp_mirror01_wall_stone":"PalBuildObject","enemycamp_piano01_stone":"PalBuildObject","enemycamp_piano02_stone":"PalBuildObject","enemycamp_tablesink01_stone":"PalBuildObject","enemycamp_toilet01_stone":"PalBuildObject","enemycamp_toiletholder01_stone":"PalBuildObject","enemycamp_curtain01_wall_stone":"PalBuildObject","enemycamp_globe01_stone":"PalBuildObject","enemycamp_stove01_stone":"PalBuildObject","enemycamp_clock01_wall_iron":"PalBuildObject","enemycamp_clock01_stone":"PalBuildObject","enemycamp_chair02_iron":"PalBuildObject","enemycamp_stool01_iron":"PalBuildObject","enemycamp_tablecircular01_iron":"PalBuildObject","enemycamp_desk01_iron":"PalBuildObject","enemycamp_tableside01_iron":"PalBuildObject","enemycamp_tablesquare01_iron":"PalBuildObject","enemycamp_tablesquare02_iron":"PalBuildObject","enemycamp_cablecoil01_iron":"PalBuildObject","enemycamp_garbagebag_iron":"PalBuildObject","enemycamp_pipeclay01_iron":"PalBuildObject","enemycamp_tire01_iron":"PalBuildObject","enemycamp_barrel01_iron":"PalBuildObject","enemycamp_barrel02_iron":"PalBuildObject","enemycamp_barrel03_iron":"PalBuildObject","enemycamp_chair01_iron":"PalBuildObject","enemycamp_sofa01_iron":"PalBuildObject","enemycamp_sofa02_iron":"PalBuildObject","enemycamp_chair01_pal":"PalBuildObject","enemycamp_machinegame01_iron":"PalBuildObject","enemycamp_machinevending01_iron":"PalBuildObject","enemycamp_television01_iron":"PalBuildObject","enemycamp_signexit_ceiling_iron":"PalBuildObject","enemycamp_signexit_wall_iron":"PalBuildObject","enemycamp_trafficcone01_iron":"PalBuildObject","enemycamp_trafficcone02_iron":"PalBuildObject","enemycamp_trafficcone03_iron":"PalBuildObject","enemycamp_trafficsign01_iron":"PalBuildObject","enemycamp_trafficsign02_iron":"PalBuildObject","enemycamp_trafficbarricade01_iron":"PalBuildObject","enemycamp_trafficbarricade02_iron":"PalBuildObject","enemycamp_trafficbarricade03_iron":"PalBuildObject","enemycamp_trafficbarricade04_iron":"PalBuildObject","enemycamp_trafficbarricade05_iron":"PalBuildObject","enemycamp_byobu":"PalBuildObject","enemycamp_kakejiku":"PalBuildObject","enemycamp_zaisu":"PalBuildObject","enemycamp_zabuton":"PalBuildObject","enemycamp_irori":"PalBuildObject","enemycamp_toro":"PalBuildObject","enemycamp_andon":"PalBuildObject","enemycamp_shishiodoshi":"PalBuildObject","enemycamp_bonsai":"PalBuildObject","enemycamp_koro":"PalBuildObject","enemycamp_seika":"PalBuildObject","enemycamp_fudukue":"PalBuildObject","enemycamp_wire_fence":"PalBuildObject","enemycamp_sf_foundation":"PalBuildObject","enemycamp_sf_wall":"PalBuildObject","enemycamp_sf_roof":"PalBuildObject","enemycamp_sf_stair":"PalBuildObject","enemycamp_sf_doorwall":"PalMapObjectDoorModel","enemycamp_sf_trianglewall":"PalBuildObject","enemycamp_sf_slantedroof":"PalBuildObject","enemycamp_sf_windowwall":"PalBuildObject","enemycamp_sf_pillars":"PalBuildObject","enemycamp_lilyqueenstatue":"PalBuildObject","enemycamp_conservationgroupbannera":"PalBuildObject","enemycamp_conservationgroupbannerb":"PalBuildObject","enemycamp_banyan_big":"PalBuildObject","enemycamp_hunter_gangflag":"PalBuildObject","enemycamp_palcage":"PalBuildObject","enemycamp_woodenbarricade":"PalBuildObject","enemycamp_olympiccauldron":"PalBuildObject","enemycamp_crusher":"PalBuildObject","enemycamp_flourmill":"PalBuildObject","enemycamp_compositedesk":"PalBuildObject","enemycamp_factory_money":"PalBuildObject","enemycamp_icecrusher":"PalBuildObject","enemycamp_basecampworkhard":"PalBuildObject","enemycamp_toolboxv1":"PalBuildObject","enemycamp_miningtool":"PalBuildObject","enemycamp_snowman":"PalBuildObject","enemycamp_transmissiontower":"PalBuildObject","enemycamp_walltorch02":"PalMapObjectTorchModel","enemycamp_firestand":"PalMapObjectTorchModel","enemycamp_candlestand":"PalMapObjectTorchModel","enemycamp_itembooth":"PalBuildObject","enemycamp_palbooth":"PalBuildObject","enemycamp_wood_fence":"PalBuildObject","enemycamp_stone_fence":"PalBuildObject","enemycamp_iron_fence":"PalBuildObject","enemycamp_glass_fence":"PalBuildObject","enemycamp_japanesestyle_fence":"PalBuildObject","enemycamp_sf_fence":"PalBuildObject","enemycamp_wallsignboard_no101":"PalBuildObject","enemycamp_wallsignboard_no102":"PalBuildObject","enemycamp_wallsignboard_no103":"PalBuildObject","enemycamp_wallsignboard_no104":"PalBuildObject","enemycamp_wallsignboard_no105":"PalBuildObject","enemycamp_wallsignboard_no106":"PalBuildObject","enemycamp_wallsignboard_no107":"PalBuildObject","enemycamp_wallsignboard_no108":"PalBuildObject","enemycamp_wallsignboard_no109":"PalBuildObject","enemycamp_wallsignboard_no110":"PalBuildObject","enemycamp_globalpalstorage":"PalBuildObject","enemycamp_factory_hard_02":"PalBuildObject","enemycamp_factory_hard_03":"PalBuildObject","enemycamp_weaponfactory_dirty_03":"PalBuildObject","enemycamp_skinchange":"PalBuildObject","enemycamp_monsterfarm":"PalBuildObjectMonsterFarm","enemycamp_breedfarm":"PalBuildObjectBreedFarm","enemycamp_displaycharacter":"PalBuildObject","enemycamp_dimensionpalstorage":"PalBuildObject","enemycamp_spherefactory_black_02":"PalBuildObject","enemycamp_spherefactory_black_03":"PalBuildObject","enemycamp_guildchest":"PalBuildObject","enemycamp_coolerpalfoodbox":"PalBuildObject","enemycamp_spa2":"PalBuildObject","enemycamp_medicalpalbed_04":"PalBuildObject","enemycamp_goalsoccer_iron":"PalBuildObject","enemycamp_trafficsign03_iron":"PalBuildObject","enemycamp_trafficsign04_iron":"PalBuildObject","enemycamp_stonepit":"PalBuildObject","enemycamp_stationdeforest2":"PalBuildObject","enemycamp_copperpit":"PalBuildObject","enemycamp_copperpit_2":"PalBuildObject","enemycamp_farmblockv2_berries":"PalBuildObject","enemycamp_farmblockv2_tomato":"PalBuildObject","enemycamp_farmblockv2_lettuce":"PalBuildObject","enemycamp_farmblockv2_carrot":"PalBuildObject","enemycamp_farmblockv2_onion":"PalBuildObject","enemycamp_farmblockv2_potato":"PalBuildObject","enemycamp_altar":"PalBuildObjectRaidBossSummon","enemycamp_lanterntop":"PalMapObjectLampModel","enemycamp_shrine_lantern":"PalMapObjectLampModel","enemycamp_guardiandogstatue":"PalBuildObject","enemycamp_hunter_flag":"PalBuildObject","enemycamp_hunter_banner":"PalBuildObject","enemycamp_believer_flag":"PalBuildObject","enemycamp_believer_banner":"PalBuildObject","enemycamp_firecult_flag":"PalBuildObject","enemycamp_firecult_banner":"PalBuildObject","enemycamp_police_flag":"PalBuildObject","enemycamp_police_banner":"PalBuildObject","enemycamp_scientist_flag":"PalBuildObject","enemycamp_scientist_banner":"PalBuildObject","enemycamp_ninja_flag":"PalBuildObject","enemycamp_ninja_banner":"PalBuildObject","enemycamp_operatingtable":"PalBuildObject"};

const WORK_BASE_TYPES = new Set([
  'EPalWorkableType::Illegal', 'EPalWorkableType::Progress',
  'EPalWorkableType::CollectItem', 'EPalWorkableType::TransportItem',
  'EPalWorkableType::TransportItemInBaseCamp', 'EPalWorkableType::ReviveCharacter',
  'EPalWorkableType::CollectResource', 'EPalWorkableType::Booth',
  'EPalWorkableType::LevelObject', 'EPalWorkableType::Repair',
  'EPalWorkableType::Defense', 'EPalWorkableType::BootUp',
  'EPalWorkableType::OnlyJoin', 'EPalWorkableType::OnlyJoinAndWalkAround',
  'EPalWorkableType::RemoveMapObjectEffect', 'EPalWorkableType::MonsterFarm',
]);

const GUILD_ORG_TYPES = new Set([
  'EPalGroupType::Guild', 'EPalGroupType::IndependentGuild',
  'EPalGroupType::Organization',
]);

const utf16Decoder = new TextDecoder('utf-16le');
const latin1Decoder = new TextDecoder('latin1');

// ---------------------------------------------------------------------------
// Reader — mirrors archive.py FArchiveReader, tracking ABSOLUTE offsets.
// ---------------------------------------------------------------------------
class Reader {
  /**
   * @param {Uint8Array} buf   buffer for this (sub)stream
   * @param {number} base      absolute offset of buf[0] within the whole GVAS
   * @param {object} ctx       shared { slots, warnings, hints }
   */
  constructor(buf, base, ctx) {
    this.buf = buf;
    this.dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    this.pos = 0;
    this.size = buf.length;
    this.base = base;
    this.ctx = ctx;
  }

  internalCopy(bytes, absBase) {
    return new Reader(bytes, absBase, this.ctx);
  }

  eof() { return this.pos >= this.size; }

  read(n) {
    const out = this.buf.subarray(this.pos, this.pos + n);
    this.pos += n;
    return out;
  }
  skip(n) { this.pos += n; }
  byteList(n) { return this.read(n); }
  readToEnd() { return this.read(this.size - this.pos); }

  byte() { const v = this.buf[this.pos]; this.pos += 1; return v; }
  bool() { return this.byte() > 0; }
  i16() { const v = this.dv.getInt16(this.pos, true); this.pos += 2; return v; }
  u16() { const v = this.dv.getUint16(this.pos, true); this.pos += 2; return v; }
  i32() { const v = this.dv.getInt32(this.pos, true); this.pos += 4; return v; }
  u32() { const v = this.dv.getUint32(this.pos, true); this.pos += 4; return v; }
  i64() { const v = this.dv.getBigInt64(this.pos, true); this.pos += 8; return v; }
  u64() { const v = this.dv.getBigUint64(this.pos, true); this.pos += 8; return v; }
  float() { const v = this.dv.getFloat32(this.pos, true); this.pos += 4; return v; }
  double() { const v = this.dv.getFloat64(this.pos, true); this.pos += 8; return v; }

  fstring() {
    let size = this.i32();
    if (size === 0) return '';
    if (size < 0) {
      size = -size;
      const data = this.read(size * 2).subarray(0, size * 2 - 2);
      return utf16Decoder.decode(data);
    }
    const data = this.read(size).subarray(0, size - 1);
    return latin1Decoder.decode(data);
  }

  // GUID read that RECORDS a slot (player-UID candidate).
  guidValue() {
    this.ctx.slots.push({ offset: this.base + this.pos, uuid: bytesToUuid(this.buf, this.pos) });
    this.pos += 16;
  }
  // GUID read that is type metadata — advance only, never record.
  guidMeta() { this.pos += 16; }
  // property `id` optional_guid: bool + optional 16 bytes (metadata).
  optionalGuid() { if (this.byte()) this.pos += 16; }

  guid() { this.guidValue(); } // alias used by rawdata scanners

  vectorDict() { this.pos += 24; } // 3 doubles
  quatDict() { this.pos += 32; }   // 4 doubles
  ftransform() { this.pos += 32 + 24 + 24; } // quat + vector + vector

  tarray(fn) { const count = this.u32(); for (let i = 0; i < count; i++) fn(this); }

  getTypeOr(path, def) {
    return Object.prototype.hasOwnProperty.call(this.ctx.hints, path)
      ? this.ctx.hints[path] : def;
  }

  // -- property machinery (mirrors archive.py) ------------------------------

  propertiesUntilEnd(path = '') {
    const props = {};
    for (;;) {
      const name = this.fstring();
      if (name === 'None') break;
      const type = this.fstring();
      const size = Number(this.u64());
      props[name] = this.property(type, size, `${path}.${name}`);
    }
    return props;
  }

  property(type, size, path, nestedCallerPath = '') {
    let value;
    const ported = PORTED_DECODERS[path];
    if (ported && (path !== nestedCallerPath || nestedCallerPath === '')) {
      value = ported(this, type, size, path);
      value.custom_type = path;
    } else {
      value = this.dispatch(type, size, path);
    }
    value.type = type;
    return value;
  }

  dispatch(type, size, path) {
    switch (type) {
      case 'StructProperty': return this.struct(path);
      case 'IntProperty': this.optionalGuid(); return { value: this.i32() };
      case 'UInt16Property': this.optionalGuid(); return { value: this.u16() };
      case 'UInt32Property': this.optionalGuid(); return { value: this.u32() };
      case 'UInt64Property': this.optionalGuid(); return { value: this.u64() };
      case 'Int64Property': this.optionalGuid(); return { value: this.i64() };
      case 'FixedPoint64Property': this.optionalGuid(); return { value: this.i32() };
      case 'FloatProperty': this.optionalGuid(); return { value: this.float() };
      case 'StrProperty': this.optionalGuid(); return { value: this.fstring() };
      case 'NameProperty': this.optionalGuid(); return { value: this.fstring() };
      case 'EnumProperty': {
        const enumType = this.fstring();
        this.optionalGuid();
        const enumValue = this.fstring();
        return { value: { type: enumType, value: enumValue } };
      }
      case 'BoolProperty': { const v = this.bool(); this.optionalGuid(); return { value: v }; }
      case 'ByteProperty': {
        const enumType = this.fstring();
        this.optionalGuid();
        const v = enumType === 'None' ? this.byte() : this.fstring();
        return { value: { type: enumType, value: v } };
      }
      case 'ArrayProperty': {
        const arrayType = this.fstring();
        this.optionalGuid();
        return { array_type: arrayType, value: this.arrayProperty(arrayType, size, path) };
      }
      case 'MapProperty': return this.mapProperty(size, path);
      case 'SetProperty': return this.setProperty(size, path);
      default:
        throw new Error(`Unknown type: ${type} (${path}) at offset ${this.base + this.pos}`);
    }
  }

  struct(path) {
    const structType = this.fstring();
    this.guidMeta();      // struct_id (never a player UID)
    this.optionalGuid();  // id
    const value = this.structValue(structType, path);
    return { struct_type: structType, value };
  }

  structValue(structType, path = '') {
    switch (structType) {
      case 'Vector': this.vectorDict(); return null;
      case 'DateTime': return this.u64();
      case 'Guid': this.guidValue(); return null;
      case 'Quat': this.quatDict(); return null;
      case 'LinearColor': this.pos += 16; return null; // 4 floats
      case 'Color': this.pos += 4; return null;        // 4 bytes
      default: return this.propertiesUntilEnd(path);
    }
  }

  arrayProperty(arrayType, size, path) {
    const count = this.u32();
    if (arrayType === 'StructProperty') {
      const propName = this.fstring();
      const propType = this.fstring();
      this.u64();
      const typeName = this.fstring();
      this.guidMeta(); // _id
      this.skip(1);
      const values = [];
      for (let i = 0; i < count; i++) values.push(this.structValue(typeName, `${path}.${propName}`));
      return { prop_name: propName, prop_type: propType, values, type_name: typeName };
    }
    const absBase = this.base + this.pos;
    const values = this.arrayValue(arrayType, count, size - 4, path);
    return { values, __absBase: absBase };
  }

  arrayValue(arrayType, count, size, path) {
    switch (arrayType) {
      case 'EnumProperty':
      case 'NameProperty': {
        const out = [];
        for (let i = 0; i < count; i++) out.push(this.fstring());
        return out;
      }
      case 'Guid': {
        const out = [];
        for (let i = 0; i < count; i++) { this.guidValue(); out.push(null); }
        return out;
      }
      case 'ByteProperty':
        if (size === count) return this.byteList(count);
        throw new Error('Labelled ByteProperty not implemented');
      default:
        throw new Error(`Unknown array type: ${arrayType} (${path})`);
    }
  }

  mapProperty(size, path) {
    const keyType = this.fstring();
    const valueType = this.fstring();
    this.optionalGuid();
    this.u32();
    const count = this.u32();
    const keyPath = `${path}.Key`;
    const keyStructType = keyType === 'StructProperty' ? this.getTypeOr(keyPath, 'Guid') : null;
    const valuePath = `${path}.Value`;
    const valueStructType = valueType === 'StructProperty' ? this.getTypeOr(valuePath, 'StructProperty') : null;
    const values = [];
    for (let i = 0; i < count; i++) {
      const key = this.propValue(keyType, keyStructType, keyPath);
      const v = this.propValue(valueType, valueStructType, valuePath);
      values.push({ key, value: v });
    }
    return { key_type: keyType, value_type: valueType, key_struct_type: keyStructType, value_struct_type: valueStructType, value: values };
  }

  setProperty(size, path) {
    const setType = this.fstring();
    this.optionalGuid();
    this.u32();
    const count = this.u32();
    const values = [];
    if (setType === 'StructProperty') {
      const structType = this.getTypeOr(`${path}.StructProperty`, 'StructProperty');
      for (let i = 0; i < count; i++) values.push(this.structValue(structType, `${path}.StructProperty`));
    } else {
      for (let i = 0; i < count; i++) values.push(this.propertiesUntilEnd());
    }
    return { value: values };
  }

  propValue(typeName, structTypeName, path) {
    switch (typeName) {
      case 'StructProperty': return this.structValue(structTypeName, path);
      case 'EnumProperty': return this.fstring();
      case 'NameProperty': return this.fstring();
      case 'IntProperty': return this.i32();
      case 'BoolProperty': return this.bool();
      case 'UInt32Property': return this.u32();
      case 'StrProperty': return this.fstring();
      case 'Int64Property': return this.i64();
      default: throw new Error(`Unknown property value type: ${typeName} (${path})`);
    }
  }
}

// ---------------------------------------------------------------------------
// Shared reader helpers used by rawdata scanners
// ---------------------------------------------------------------------------
function instanceIdReader(r) { r.guidValue(); r.guidValue(); }
function uuidReader(r) { r.guidValue(); }

// ---------------------------------------------------------------------------
// Sub-blob scanning
// ---------------------------------------------------------------------------
// holder = { values: Uint8Array|Array, __absBase: number }
function subScan(reader, holder, fn, label) {
  const bytes = holder && holder.values;
  if (!bytes || bytes.length === 0) return; // matches empty-blob short-circuits
  const buf = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes);
  const mark = reader.ctx.slots.length;
  const sub = reader.internalCopy(buf, holder.__absBase);
  try {
    fn(sub);
  } catch (e) {
    reader.ctx.slots.length = mark; // leave this blob unrecorded
    reader.ctx.warnings.push(`${label}: ${e && e.message ? e.message : e}`);
  }
}

// ---------------------------------------------------------------------------
// rawdata/character.py  (decode side)
// ---------------------------------------------------------------------------
function characterDecode(reader, type, size, path) {
  if (type !== 'ArrayProperty') throw new Error(`Expected ArrayProperty, got ${type}`);
  const value = reader.property(type, size, path, path);
  subScan(reader, value.value, (r) => {
    r.propertiesUntilEnd('');   // object
    r.byteList(4);              // unknown_bytes
    r.guidValue();              // group_id
    r.byteList(4);              // trailing_bytes
    // trailing_unknown_bytes: read_to_end (no guids)
  }, `character ${path}`);
  return value;
}

// ---------------------------------------------------------------------------
// rawdata/character_container.py  (decode side)
// ---------------------------------------------------------------------------
function characterContainerDecode(reader, type, size, path) {
  if (type !== 'ArrayProperty') throw new Error(`Expected ArrayProperty, got ${type}`);
  const value = reader.property(type, size, path, path);
  subScan(reader, value.value, (r) => {
    r.guidValue(); // player_uid
    r.guidValue(); // instance_id
    r.byte();      // permission_tribe_id
    // unknown_bytes: read_to_end (no guids)
  }, `character_container ${path}`);
  return value;
}

// ---------------------------------------------------------------------------
// rawdata/group.py  (decode side)
// ---------------------------------------------------------------------------
function guildMarkerReader(r) {
  r.guidValue();   // marker_id
  r.vectorDict();  // icon_location
  r.i32();         // icon_type
  r.guidValue();   // owner_player_uid
}
function playerInfoReader(r) {
  r.guidValue();   // player_uid
  r.i64();         // last_online_real_time
  r.fstring();     // player_name
}
function guildPlayerInfoReader(r) {
  playerInfoReader(r);
  r.byte();        // role
}
function rolePermissionReader(r) {
  r.byte();                        // role
  r.tarray((rr) => rr.byte());     // permissions
}
function readGuildTailV2(r) {
  r.tarray((rr) => rr.byte());     // guild_chest_allowed_roles
  r.i32();                         // unknown_i32
  r.guidValue();                   // admin_player_uid
  r.tarray(guildPlayerInfoReader); // players
  r.tarray(rolePermissionReader);  // role_permissions
  r.byteList(4);                   // trailing_bytes
}
function readGuildTailV1(r) {
  r.guidValue();                   // admin_player_uid
  r.tarray(playerInfoReader);      // players
  r.byteList(4);                   // trailing_bytes
}
function readGuildTail(r) {
  const start = r.pos;
  const mark = r.ctx.slots.length;
  try {
    readGuildTailV2(r);
    if (r.eof()) return;
  } catch (e) { /* not v2 */ }
  // roll back slots + position and try the pre-update layout
  r.ctx.slots.length = mark;
  r.pos = start;
  readGuildTailV1(r);
}
function decodeGroupBytes(r, groupType) {
  r.guidValue();                 // group_id
  r.fstring();                   // group_name
  r.tarray(instanceIdReader);    // individual_character_handle_ids
  if (GUILD_ORG_TYPES.has(groupType)) r.byte(); // org_type
  if (groupType === 'EPalGroupType::Organization') r.byteList(12);
  if (groupType === 'EPalGroupType::Guild') {
    r.byteList(4);               // leading_bytes
    r.tarray(uuidReader);        // base_ids
    r.i32();                     // unknown_1
    r.i32();                     // base_camp_level
    r.tarray(uuidReader);        // map_object_instance_ids_base_camp_points
    r.fstring();                 // guild_name
    r.guidValue();               // last_guild_name_modifier_player_uid
    r.tarray(guildMarkerReader); // guild_markers
    readGuildTail(r);
  }
  if (groupType === 'EPalGroupType::IndependentGuild') {
    r.i32();                     // base_camp_level
    r.tarray(uuidReader);        // map_object_instance_ids_base_camp_points
    r.fstring();                 // guild_name
    r.guidValue();               // player_uid
    r.fstring();                 // guild_name_2
    r.i64();                     // last_online_real_time
    r.fstring();                 // player_name
  }
  if (!r.eof()) throw new Error('Warning: EOF not reached');
}
function groupDecode(reader, type, size, path) {
  if (type !== 'MapProperty') throw new Error(`Expected MapProperty, got ${type}`);
  const value = reader.property(type, size, path, path);
  for (const group of value.value) {
    const groupType = group.value.GroupType.value.value;
    subScan(reader, group.value.RawData.value, (r) => decodeGroupBytes(r, groupType), `group ${path}`);
  }
  return value;
}

// ---------------------------------------------------------------------------
// rawdata/map_model.py  (decode side)
// ---------------------------------------------------------------------------
function decodeMapModelBytes(r) {
  r.guidValue(); // instance_id
  r.guidValue(); // concrete_model_instance_id
  r.guidValue(); // base_camp_id_belong_to
  r.guidValue(); // group_id_belong_to
  r.i32(); r.i32(); // hp {current, max}
  r.ftransform();
  r.guidValue(); // repair_work_id
  r.guidValue(); // owner_spawner_level_object_instance_id
  r.guidValue(); // owner_instance_id
  r.guidValue(); // build_player_uid
  r.byte();      // interact_restrict_type
  r.float();     // deterioration_damage
  r.guidValue(); r.u32(); // stage_instance_id_belong_to {id, valid}
  // trailing unknown bytes: read_to_end, no throw on non-eof (matches Python)
}

// ---------------------------------------------------------------------------
// rawdata/common.py helpers
// ---------------------------------------------------------------------------
function palItemAndNumRead(r) {
  r.fstring();   // static_id
  r.guidValue(); // created_world_id
  r.guidValue(); // local_id_in_created_world
  r.u32();       // num
}
function palItemBoothTradeInfoRead(r) {
  // product
  r.fstring(); r.guidValue(); r.guidValue(); r.u32();
  // cost
  r.fstring(); r.guidValue(); r.guidValue(); r.u32();
  // seller_player_uid
  r.guidValue();
}

// ---------------------------------------------------------------------------
// rawdata/map_concrete_model.py  (decode side)
// ---------------------------------------------------------------------------
function decodeConcreteModelBytes(r, objectId) {
  const mark = r.ctx.slots.length;
  const objl = objectId.toLowerCase();
  if (!Object.prototype.hasOwnProperty.call(MAP_OBJECT_NAME_TO_CONCRETE_MODEL_CLASS, objl)) {
    return; // not in database -> stored raw, no slots
  }
  r.guidValue(); // instance_id
  r.guidValue(); // model_instance_id
  const cls = MAP_OBJECT_NAME_TO_CONCRETE_MODEL_CLASS[objl];
  try {
    switch (cls) {
      case 'PalMapObjectCharacterTeamMissionModel':
        r.fstring(); r.byte(); r.i64(); r.readToEnd();
        break;
      case 'PalMapObjectFarmSkillFruitsModel':
        r.byteList(4); r.fstring(); r.byte(); r.float(); r.byteList(20);
        break;
      case 'PalMapObjectSupplyStorageModel':
        r.i64(); r.byteList(8);
        break;
      case 'PalMapObjectItemBoothModel':
        r.byteList(4); r.guidValue(); r.tarray(palItemBoothTradeInfoRead);
        r.byteList(12); r.byte(); r.byteList(7);
        break;
      case 'PalMapObjectPalBoothModel': {
        r.byteList(4);
        r.readToEnd(); // rest sliced; no guids
        break;
      }
      case 'PalMapObjectMultiHatchingEggModel':
        r.readToEnd();
        break;
      case 'PalMapObjectEnergyStorageModel':
        r.float(); r.byteList(8);
        break;
      case 'PalMapObjectDeathDroppedCharacterModel':
        r.guidValue(); // stored_parameter_id
        r.guidValue(); // owner_player_uid
        if (!r.eof()) r.readToEnd();
        break;
      case 'PalMapObjectConvertItemModel':
        r.byteList(4); r.fstring(); r.i32(); r.i32(); r.float(); r.byteList(8);
        break;
      case 'PalMapObjectPickupItemOnLevelModel':
        r.u32();
        break;
      case 'PalMapObjectDropItemModel':
        r.u32(); r.guidValue(); r.i64();
        r.fstring(); r.guidValue(); r.guidValue(); // item_id
        r.byteList(4);
        break;
      case 'PalMapObjectItemDropOnDamagModel':
        r.tarray(palItemAndNumRead);
        if (!r.eof()) r.readToEnd();
        break;
      case 'PalMapObjectDeathPenaltyStorageModel':
        r.u32(); r.guidValue(); r.u64();
        if (!r.eof()) r.byteList(4);
        break;
      case 'PalMapObjectDefenseBulletLauncherModel':
        r.byteList(4); r.i32(); r.i32(); r.fstring(); r.byteList(4);
        break;
      case 'PalMapObjectGenerateEnergyModel':
        r.float(); r.float(); r.float();
        break;
      case 'PalMapObjectFarmBlockV2Model':
        r.float(); r.fstring(); r.byte(); r.float(); r.float();
        r.float(); r.float(); // state_machine
        r.byteList(8);
        break;
      case 'PalMapObjectFastTravelPointModel':
        r.guidValue();
        if (!r.eof()) r.readToEnd();
        break;
      case 'PalMapObjectShippingItemModel':
        r.tarray((rr) => rr.i32());
        break;
      case 'PalMapObjectProductItemModel':
        r.byteList(4); r.float(); r.fstring(); r.byteList(4);
        break;
      case 'PalMapObjectRecoverOtomoModel':
        r.float();
        break;
      case 'PalMapObjectHatchingEggModel':
        r.byteList(4); r.propertiesUntilEnd(); r.i32(); r.guidValue(); r.byteList(4);
        break;
      case 'PalMapObjectTreasureBoxModel':
        r.byte(); r.byte(); r.byte(); r.float(); r.byte(); r.byte();
        break;
      case 'PalMapObjectBreedFarmModel':
        r.byteList(4); r.tarray(uuidReader); r.byteList(4);
        break;
      case 'PalMapObjectSignboardModel':
        r.byteList(4); r.fstring(); r.guidValue(); r.byteList(4);
        break;
      case 'PalMapObjectTorchModel':
        r.i32(); r.i64(); r.byteList(4);
        break;
      case 'PalMapObjectPalEggModel':
        r.u32(); r.guidValue(); r.i64();
        break;
      case 'PalMapObjectBaseCampPoint':
        r.byteList(4); r.guidValue(); r.byteList(4);
        break;
      case 'PalMapObjectItemChestModel':
      case 'PalMapObjectItemChest_AffectCorruption':
        r.byteList(4); r.guidValue(); r.byteList(4);
        break;
      case 'PalMapObjectDimensionPalStorageModel':
        r.byteList(12);
        break;
      case 'PalMapObjectPlayerBedModel':
      case 'PalBuildObject':
      case 'PalMapObjectCharacterStatusOperatorModel':
      case 'PalMapObjectRankUpCharacterModel':
      case 'BlueprintGeneratedClass':
      case 'PalMapObjectMedicalPalBedModel':
      case 'PalMapObjectDoorModel':
      case 'PalMapObjectMonsterFarmModel':
      case 'PalMapObjectAmusementModel':
      case 'PalMapObjectLampModel':
      case 'PalMapObjectLabModel':
      case 'PalMapObjectRepairItemModel':
      case 'PalMapObjectBaseCampPassiveWorkHardModel':
      case 'PalMapObjectBaseCampPassiveEffectModel':
      case 'PalMapObjectBaseCampItemDispenserModel':
      case 'PalMapObjectGuildChestModel':
      case 'PalMapObjectCharacterMakeModel':
      case 'PalMapObjectPalFoodBoxModel':
      case 'PalMapObjectPlayerSitModel':
      case 'PalMapObjectBaseCampWorkerDirectorModel':
      case 'PalMapObjectPalMedicineBoxModel':
      case 'PalMapObjectDefenseWaitModel':
      case 'PalMapObjectHeatSourceModel':
      case 'PalMapObjectDisplayCharacterModel':
      case 'Default_PalMapObjectConcreteModelBase':
      case 'PalMapObjectDamagedScarecrowModel':
      case 'PalMapObjectGlobalPalStorageModel':
        r.byteList(4);
        break;
      default:
        r.ctx.slots.length = mark; // unknown concrete model -> stored raw
        return;
    }
  } catch (e) {
    r.ctx.slots.length = mark; // failed decode -> stored raw
    return;
  }
  // trailing_unknown_bytes: read_to_end (no guids)
}

// ---------------------------------------------------------------------------
// rawdata/map_concrete_model_module.py  (decode side)
// ---------------------------------------------------------------------------
function moduleSlotIndexesReader(r) {
  r.byte();                     // attribute
  r.tarray((rr) => rr.i32());   // indexes
}
function playerLockInfoReader(r) {
  r.guidValue(); // player_uid
  r.i32();       // try_failed_count
  r.u32();       // try_success_cache
}
function decodeModuleBytes(r, moduleType) {
  switch (moduleType) {
    case 'EPalMapObjectConcreteModelModuleType::ItemContainer':
      r.guidValue();
      r.tarray(moduleSlotIndexesReader);
      r.tarray((rr) => rr.byte());
      r.u32(); r.byte(); r.byteList(4);
      break;
    case 'EPalMapObjectConcreteModelModuleType::CharacterContainer':
      r.guidValue(); r.byteList(4);
      break;
    case 'EPalMapObjectConcreteModelModuleType::Workee':
      r.guidValue(); r.byteList(4);
      break;
    case 'EPalMapObjectConcreteModelModuleType::Switch':
      r.byte(); r.byteList(4);
      break;
    case 'EPalMapObjectConcreteModelModuleType::PasswordLock':
      r.byte(); r.fstring(); r.tarray(playerLockInfoReader); r.byteList(4);
      break;
    case 'EPalMapObjectConcreteModelModuleType::RequireElementalAction':
      r.fstring(); r.byteList(12);
      break;
    default:
      break; // Energy/StatusObserver/ItemStack/PlayerRecord/BaseCampPassiveEffect: no fields
  }
  // unknown_bytes: read_to_end (no guids)
}

// ---------------------------------------------------------------------------
// rawdata/work.py  (decode side)
// ---------------------------------------------------------------------------
function decodeWorkBytes(r, workType) {
  let matched = false;
  if (WORK_BASE_TYPES.has(workType)) {
    matched = true;
    r.guidValue(); // id
    // workable_bounds
    r.vectorDict(); r.quatDict();
    r.vectorDict(); r.vectorDict(); r.double(); // box_sphere_bounds
    r.guidValue(); // base_camp_id_belong_to
    r.guidValue(); // owner_map_object_model_id
    r.guidValue(); // owner_map_object_concrete_model_id
    r.byte();      // current_state
    r.tarray((rr) => { rr.vectorDict(); rr.vectorDict(); }); // assign_locations
    r.byte();      // behaviour_type
    r.fstring();   // assign_define_data_id
    r.byte();      // override_work_type
    r.byte();      // assignable_fixed_type
    r.u32(); r.u32(); r.u32();
    switch (workType) {
      case 'EPalWorkableType::Defense':
        r.byteList(4); r.byte(); r.byteList(4);
        break;
      case 'EPalWorkableType::Progress':
        r.float(); r.float(); r.i32(); r.byte(); r.float(); r.float(); r.float();
        break;
      case 'EPalWorkableType::ReviveCharacter':
        r.guidValue(); r.guidValue(); // target_individual_id
        break;
      case 'EPalWorkableType::Repair':
      case 'EPalWorkableType::MonsterFarm':
      case 'EPalWorkableType::OnlyJoinAndWalkAround':
      case 'EPalWorkableType::OnlyJoin':
      case 'EPalWorkableType::Booth':
        r.float();
        break;
      default:
        break;
    }
  } else if (workType === 'EPalWorkableType::Assign' || workType === 'EPalWorkableType::LevelObject') {
    matched = true;
    r.guidValue(); // handle_id
    r.i32(); r.byte();
    r.guidValue(); r.guidValue(); // assigned_individual_id
    r.byte(); r.u32();
    if (workType === 'EPalWorkableType::LevelObject') r.guidValue(); // target_map_object_model_id
  }
  if (!matched) return; // fallback raw, no transform read
  const transformType = r.byte();
  if (transformType === 2) { r.guidValue(); r.byteList(8); }
  // unknown_bytes: read_to_end (no guids)
}
function decodeWorkAssignBytes(r) {
  r.guidValue(); // id
  r.i32(); r.byte();
  r.guidValue(); r.guidValue(); // assigned_individual_id
  r.byte(); r.u32(); r.byteList(4);
  // unknown_bytes: read_to_end (no guids)
}
function workDecode(reader, type, size, path) {
  if (type !== 'ArrayProperty') throw new Error(`Expected ArrayProperty, got ${type}`);
  const value = reader.property(type, size, path, path);
  for (const workElement of value.value.values) {
    const workType = workElement.WorkableType.value.value;
    subScan(reader, workElement.RawData.value, (r) => decodeWorkBytes(r, workType), `work ${path}`);
    for (const workAssign of workElement.WorkAssignMap.value) {
      subScan(reader, workAssign.value.RawData.value, (r) => decodeWorkAssignBytes(r), `work_assign ${path}`);
    }
  }
  return value;
}

// ---------------------------------------------------------------------------
// rawdata/map_object.py  (decode side) — dispatches to map_model,
// map_concrete_model and map_concrete_model_module. Connector / BuildProcess
// blobs are treated as opaque (their scanners were not ported).
// ---------------------------------------------------------------------------
function mapObjectDecode(reader, type, size, path) {
  if (type !== 'ArrayProperty') throw new Error(`Expected ArrayProperty, got ${type}`);
  const value = reader.property(type, size, path, path);
  for (const mo of value.value.values) {
    subScan(reader, mo.Model.value.RawData.value, (r) => decodeMapModelBytes(r), `map_model ${path}`);
    // Connector.RawData, BuildProcess.RawData -> opaque (not ported)
    const mapObjectId = mo.MapObjectId.value;
    subScan(reader, mo.ConcreteModel.value.RawData.value, (r) => decodeConcreteModelBytes(r, mapObjectId), `concrete_model ${path}`);
    for (const module of mo.ConcreteModel.value.ModuleMap.value) {
      const moduleType = module.key;
      subScan(reader, module.value.RawData.value, (r) => decodeModuleBytes(r, moduleType), `module ${path}`);
    }
  }
  return value;
}

// ---------------------------------------------------------------------------
// PALWORLD_CUSTOM_PROPERTIES dispatch — only the ported decoders. Every other
// custom-property path falls through to the normal type parse (opaque bytes).
// ---------------------------------------------------------------------------
const PORTED_DECODERS = {
  '.worldSaveData.GroupSaveDataMap': groupDecode,
  '.worldSaveData.CharacterSaveParameterMap.Value.RawData': characterDecode,
  '.worldSaveData.CharacterContainerSaveData.Value.Slots.Slots.RawData': characterContainerDecode,
  '.worldSaveData.WorkSaveData': workDecode,
  '.worldSaveData.MapObjectSaveData': mapObjectDecode,
};

// ---------------------------------------------------------------------------
// GVAS header (gvas.py GvasHeader.read) — skipped, tracking offsets only.
// ---------------------------------------------------------------------------
function readGvasHeader(r) {
  const magic = r.i32();
  if (magic !== 1396790855) throw new Error('invalid magic');
  const saveGameVersion = r.i32();
  if (saveGameVersion !== 3) throw new Error(`expected save game version 3, got ${saveGameVersion}`);
  r.i32(); // package_file_version_ue4
  r.i32(); // package_file_version_ue5
  r.u16(); r.u16(); r.u16(); // engine version major/minor/patch
  r.u32(); // engine_version_changelist
  r.fstring(); // engine_version_branch
  const customVersionFormat = r.i32();
  if (customVersionFormat !== 3) throw new Error(`expected custom version format 3, got ${customVersionFormat}`);
  // custom_versions: tarray of (guid, i32) — guids are metadata, not slots
  r.tarray((rr) => { rr.guidMeta(); rr.i32(); });
  r.fstring(); // save_game_class_name
}

// ---------------------------------------------------------------------------
// Public: findGuidSlots
// ---------------------------------------------------------------------------
/**
 * Walk a decompressed GVAS buffer and record every GUID slot that could hold a
 * player UID (absolute byte offset + current lowercase-dashed uuid).
 * @param {Uint8Array} gvasBytes
 * @returns {{ slots: {offset:number, uuid:string}[], warnings: string[] }}
 */
export function findGuidSlots(gvasBytes) {
  const ctx = { slots: [], warnings: [], hints: PALWORLD_TYPE_HINTS };
  const reader = new Reader(gvasBytes, 0, ctx);
  readGvasHeader(reader);
  reader.propertiesUntilEnd('');
  // trailer (read_to_end) ignored — contains no GUID slots
  return { slots: ctx.slots, warnings: ctx.warnings };
}

// ---------------------------------------------------------------------------
// Public: patchGuids
// ---------------------------------------------------------------------------
/**
 * Overwrite, in place, the raw bytes of every slot whose current uuid appears
 * as a key in `mapping`.
 * @param {Uint8Array} gvasBytes
 * @param {{offset:number, uuid:string}[]} slots
 * @param {Map<string,string>} mapping  lowercase-uuid -> lowercase-uuid
 * @returns {{ patched: Object<string, number> }}
 */
export function patchGuids(gvasBytes, slots, mapping) {
  const patched = {};
  for (const slot of slots) {
    if (!mapping.has(slot.uuid)) continue;
    const target = mapping.get(slot.uuid);
    gvasBytes.set(uuidToBytes(target), slot.offset);
    patched[slot.uuid] = (patched[slot.uuid] || 0) + 1;
  }
  return { patched };
}

// ---------------------------------------------------------------------------
// Container format (compressor/*) — parseSavHeader / decompressSav / buildSav
// ---------------------------------------------------------------------------
const MAGIC = {
  PlZ: [0x50, 0x6c, 0x5a],
  PlM: [0x50, 0x6c, 0x4d],
  CNK: [0x43, 0x4e, 0x4b],
};
// SaveType byte values (enums.py): CNK=48(0x30), PLM=49(0x31), PLZ=50(0x32)
const SAVETYPE_PLM = 0x31;
const SAVETYPE_PLZ = 0x32;

function magicToFormat(b8, b9, b10) {
  if (b8 === 0x50 && b9 === 0x6c && b10 === 0x5a) return 'PlZ';
  if (b8 === 0x50 && b9 === 0x6c && b10 === 0x4d) return 'PlM';
  if (b8 === 0x43 && b9 === 0x4e && b10 === 0x4b) return 'CNK';
  return null;
}

function u32le(u8, off) {
  return (u8[off] | (u8[off + 1] << 8) | (u8[off + 2] << 16) | (u8[off + 3] << 24)) >>> 0;
}

/**
 * Parse a .sav container header (compressor/__init__.py _parse_sav_header +
 * check_sav_format). For the CNK double-header variant the *inner* magic/save
 * type and a 24-byte data offset are returned; `format` reflects the outer
 * magic (which drives zlib-vs-oodle dispatch, same as core.py).
 * @param {Uint8Array} u8
 * @returns {{format:'PlZ'|'CNK'|'PlM', saveType:number, uncompressedLen:number, compressedLen:number, dataOffset:number}}
 */
export function parseSavHeader(u8) {
  if (u8.length < 24) throw new Error('File too small to parse header');
  const outerFormat = magicToFormat(u8[8], u8[9], u8[10]);
  let uncompressedLen = u32le(u8, 0);
  let compressedLen = u32le(u8, 4);
  let saveType = u8[11];
  let dataOffset = 12;
  let format = outerFormat;
  if (outerFormat === 'CNK') {
    uncompressedLen = u32le(u8, 12);
    compressedLen = u32le(u8, 16);
    const innerFormat = magicToFormat(u8[20], u8[21], u8[22]);
    if (innerFormat === null) throw new Error('Unknown inner magic bytes in CNK header');
    saveType = u8[23];
    dataOffset = 24;
    format = 'CNK'; // outer format drives zlib dispatch (core.py)
  }
  if (format === null) throw new Error('Unknown magic bytes at offset 8');
  return { format, saveType, uncompressedLen, compressedLen, dataOffset };
}

function toU8(x) { return x instanceof Uint8Array ? x : new Uint8Array(x); }

/**
 * Decompress a .sav into its GVAS bytes using an injected codec.
 * codec: { deflate, inflate, oozDecompress(u8, rawLen), oozCompress(u8) }
 * @returns {Promise<{gvas:Uint8Array, format:string, saveType:number}>}
 */
export async function decompressSav(u8, codec) {
  const h = parseSavHeader(u8);
  if (h.format === 'PlM') {
    const compressed = u8.subarray(h.dataOffset, h.dataOffset + h.compressedLen);
    const gvas = toU8(await codec.oozDecompress(compressed, h.uncompressedLen));
    if (gvas.length !== h.uncompressedLen) {
      throw new Error(`Decompressed data length ${gvas.length} != expected ${h.uncompressedLen}`);
    }
    return { gvas, format: h.format, saveType: h.saveType };
  }
  // PlZ / CNK -> zlib (compressor/zlib.py)
  let data = toU8(await codec.inflate(u8.subarray(h.dataOffset)));
  if (h.saveType === SAVETYPE_PLZ) {
    if (h.compressedLen !== data.length) {
      throw new Error(`incorrect compressed length: ${h.compressedLen}`);
    }
    data = toU8(await codec.inflate(data));
  }
  if (h.uncompressedLen !== data.length) {
    throw new Error(`incorrect uncompressed length: ${h.uncompressedLen} != ${data.length}`);
  }
  return { gvas: data, format: h.format, saveType: h.saveType };
}

function buildContainer(compressed, uncompressedLen, compressedLen, magicName, saveType) {
  const magic = MAGIC[magicName];
  const out = new Uint8Array(12 + compressed.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, uncompressedLen >>> 0, true);
  dv.setUint32(4, compressedLen >>> 0, true);
  out[8] = magic[0]; out[9] = magic[1]; out[10] = magic[2];
  out[11] = saveType;
  out.set(compressed, 12);
  return out;
}

/**
 * Rebuild a .sav container from GVAS bytes (compressor/{zlib,oozlib}.py +
 * Compressor.build_sav — single 12-byte header). PlM = single Oodle block;
 * zlib save type 0x32 = double zlib, otherwise single zlib.
 * @returns {Promise<Uint8Array>}
 */
export async function buildSav(gvasBytes, meta, codec) {
  const { format, saveType } = meta;
  const uncompressedLen = gvasBytes.length;
  if (format === 'PlM' || saveType === SAVETYPE_PLM) {
    const compressed = toU8(await codec.oozCompress(gvasBytes));
    return buildContainer(compressed, uncompressedLen, compressed.length, 'PlM', SAVETYPE_PLM);
  }
  // zlib
  const inner = toU8(await codec.deflate(gvasBytes));
  const compressedLen = inner.length; // length after the FIRST deflate (zlib.py)
  let finalData = inner;
  if (saveType === SAVETYPE_PLZ) finalData = toU8(await codec.deflate(inner));
  const magicName = format === 'CNK' ? 'CNK' : 'PlZ';
  return buildContainer(finalData, uncompressedLen, compressedLen, magicName, saveType);
}
