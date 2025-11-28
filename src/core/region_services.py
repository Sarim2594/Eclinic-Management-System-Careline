from fastapi import HTTPException, status
from typing import Dict, Any

def lookup_province_and_region(db, city: str) -> Dict[str, Any]:
    """Gets province and sub-region for a given city."""
    with db.get_cursor() as cursor:
        cursor.execute("""
            SELECT city, sub_region, province
            FROM pakistan_regions
            WHERE LOWER(city) = LOWER(%s)
            LIMIT 1
        """, (city,))
        
        result = cursor.fetchone()
        
        if not result:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"City '{city}' not found in regions database")
        
        return {
            "success": True,
            "city": result['city'],
            "sub_region": result['sub_region'],
            "province": result['province'],
            "region_key": f"{result['province']}|{result['sub_region']}"
        }

def get_all_geographical_regions(db) -> Dict[str, Any]:
    """Retrieves and organizes all provinces, sub-regions, and cities hierarchically."""
    with db.get_cursor() as cursor:
            cursor.execute("""
                SELECT id, province, sub_region
                FROM regions
                ORDER BY province, sub_region
            """)
            
            regions = cursor.fetchall()
            
            # Group by province
            grouped = {}
            for region in regions:
                province = region['province']
                if province not in grouped:
                    grouped[province] = []
                grouped[province].append({
                    'id': region['id'],
                    'sub_region': region['sub_region']
                })
            
            return {
                "success": True,
                "regions": regions,
                "grouped": grouped
            }
    
async def get_cities_in_a_region(db, region_id: int):
    """Get all cities in a specific region"""
    try:
        with db.get_cursor() as cursor:
            cursor.execute("""
                SELECT c.id, c.name, r.province, r.sub_region
                FROM cities c
                JOIN regions r ON c.region_id = r.id
                WHERE r.id = %s
                ORDER BY c.name
            """, (region_id,))
            
            cities = cursor.fetchall()
            
            return {
                "success": True,
                "cities": cities
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
def get_cities_for_clinic_creation(db):
    """Get all cities with their region information"""
    try:
        with db.get_cursor() as cursor:
            cursor.execute("""
                SELECT c.id, c.name, r.province, r.sub_region, r.id as region_id
                FROM cities c
                JOIN regions r ON c.region_id = r.id
                ORDER BY r.province, r.sub_region, c.name
            """)
            
            cities = cursor.fetchall()
            
            # Group by province and sub-region for easier frontend display
            grouped = {}
            for city in cities:
                province = city['province']
                sub_region = city['sub_region']
                
                if province not in grouped:
                    grouped[province] = {}
                if sub_region not in grouped[province]:
                    grouped[province][sub_region] = []
                
                grouped[province][sub_region].append({
                    'id': city['id'],
                    'name': city['name'],
                    'region_id': city['region_id']
                })
            
            return {
                "success": True,
                "cities": cities,
                "grouped": grouped
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    