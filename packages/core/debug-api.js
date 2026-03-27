// Debug script to check swisseph-wasm API
import('swisseph-wasm').then(module => {
  const SwissEph = module.default;
  console.log('Creating SwissEph instance...');
  const sweph = new SwissEph();
  
  console.log('Initializing...');
  sweph.initSwissEph().then(() => {
    console.log('Initialized successfully');
    
    // Set ephemeris path (empty for default)
    sweph.set_ephe_path('');
    
    // Test date conversion
    const date = new Date('2000-01-01T12:00:00Z');
    console.log('Converting date to JD:', date.toISOString());
    
    try {
      const jdResult = sweph.utc_to_jd(
        date.getUTCFullYear(),
        date.getUTCMonth() + 1,
        date.getUTCDate(),
        date.getUTCHours(),
        date.getUTCMinutes(),
        date.getUTCSeconds(),
        1 // Gregorian
      );
      console.log('JD result:', jdResult);
      console.log('Julian Day UT:', jdResult.julianDayUT);
      console.log('Julian Day ET:', jdResult.julianDayET);
      
      // Try to calculate Sun position
      const flags = sweph.SEFLG_SWIEPH | sweph.SEFLG_SPEED;
      console.log('Flags:', flags);
      console.log('SE_SUN constant:', sweph.SE_SUN);
      
      const result = sweph.calc_ut(jdResult.julianDayUT, sweph.SE_SUN, flags);
      console.log('Sun calculation result:', result);
      console.log('Result keys:', Object.keys(result));
      
      if (result && typeof result === 'object') {
        for (const [key, value] of Object.entries(result)) {
          console.log(`  ${key}: ${value} (${typeof value})`);
        }
      }
      
    } catch (err) {
      console.error('Error during calculation:', err);
      console.error(err.stack);
    }
    
  }).catch(err => {
    console.error('Error initializing:', err);
    console.error(err.stack);
  });
  
}).catch(err => {
  console.error('Error importing:', err);
});