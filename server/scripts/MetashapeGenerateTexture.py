import Metashape
import csv
import argparse
from os import walk, path

def convert(s):
    if s.lower() == "true":
        return True
    else:
        return False

#get args
argv = sys.argv

#parse args
parser = argparse.ArgumentParser()
parser.add_argument("-i", "--input", required=True, help="Images filepath")
parser.add_argument("-m", "--model", required=True, help="Model filepath")
parser.add_argument("-o", "--output", required=True, help="Output filename")
parser.add_argument("-sb", required=False, help="Scalebar definition file")
parser.add_argument("-optm", required=False, default="False", help="Optimize markers")
parser.add_argument("-bdc", required=False, default="False", help="Build dense cloud")
args = parser.parse_args()

doc = Metashape.app.document
chunk = doc.addChunk()

imagePath = args.input
modelPath = args.model
name = os.path.basename(os.path.normpath(imagePath))

# Grab images from directory (include subdirectories)
imageFiles=[]
for r, d, f in walk(imagePath):
    for i, file in enumerate(f):
        imageFiles.append(os.path.join(r, file))

# Add photos
chunk.addPhotos(imageFiles)

chunk.matchPhotos\
(
    downscale=0,
    generic_preselection=True,
    reference_preselection=False,
    #reference_preselection_mode=Metashape.ReferencePreselectionSource,
    filter_mask=False,
    mask_tiepoints=False,
    keypoint_limit=40000,
    tiepoint_limit=4000,
    keep_keypoints=False,
    guided_matching=False,
    reset_matches=False
)

# align the matched image pairs
chunk.alignCameras()

# optimize cameras
chunk.optimizeCameras\
(
    adaptive_fitting=True
)

# Load model
chunk.importModel(modelPath, Metashape.ModelFormatOBJ)


# UV unwrap model
chunk.buildUV\
(
    mapping_mode=Metashape.GenericMapping,
    page_count=1,
    adaptive_resolution=False
)

chunk.buildTexture\
(
    blending_mode=Metashape.MosaicBlending,
    texture_size=8192,
    fill_holes=False,
    ghosting_filter=False,
    texture_type=Metashape.Model.DiffuseMap,
)

chunk.exportModel\
(
    path=imagePath+"\\..\\"+args.output,
    binary=True,
    precision=6,
    texture_format=Metashape.ImageFormatTIFF,
    save_texture=True,
    save_uv=True,
    save_normals=True,
    save_colors=True,
    save_cameras=True,
    save_markers=True,
    save_udim=False,
    save_alpha=False,
    strip_extensions=False,
    raster_transform=Metashape.RasterTransformNone,
    colors_rgb_8bit=True,
    comment="Created via Metashape python",
    save_comment=True,
    format=Metashape.ModelFormatOBJ,
)

doc.save(imagePath+"\\..\\"+name+".psx")
