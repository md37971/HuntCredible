from PIL import Image
from PIL.ExifTags import TAGS
from exif import Image as exifImage
import io

class ImageCoordinates:
    def __init__(self, contents):
        try:
            self.image = exifImage(io.BytesIO(contents))
        except Exception as e:
            print(f"EXIF parsing error: {e}")
            self.image = None
        

    def toDecimal(self, coords, ref):
        if isinstance(ref, bytes):
            ref = ref.decode('ascii').strip("\x00")

        decimal = coords[0] + coords[1]/60 + coords[2]/3600

        if ref in ['S', 'W']:
            decimal = -decimal
        return decimal

    def getCoordinates(self):
            if self.image is None:
                return None

            if not self.image.has_exif:
                print("No EXIF metadata found.")
                return None

            try:
                if hasattr(self.image, "gps_latitude") and hasattr(self.image, "gps_longitude"):
                    lat = self.toDecimal(self.image.gps_latitude, self.image.gps_latitude_ref)
                    lon = self.toDecimal(self.image.gps_longitude, self.image.gps_longitude_ref)

                    #print(f"Coordinates: {lat}, {lon}")
                    return lat, lon
                return None
            except Exception as e:
                print(f"ERROR: {e}")
                return None