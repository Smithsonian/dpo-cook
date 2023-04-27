import Metashape
import csv
import sys
import os
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
parser.add_argument("-c", "--cameras", required=True, help="Cameras filepath")
parser.add_argument("-m", "--model", required=True, help="Model filepath")
parser.add_argument("-o", "--output", required=True, help="Output filename")
args = parser.parse_args()

doc = Metashape.app.document
chunk = doc.addChunk()

imagePath = args.input
modelPath = args.model
camerasPath = args.cameras
name = os.path.basename(os.path.normpath(imagePath))

# Grab images from directory (include subdirectories)
imageFiles=[]
for r, d, f in walk(imagePath):
    for i, file in enumerate(f):
        imageFiles.append(os.path.join(r, file))

# set 'Scale Bar Accuracy' to 0.0001
chunk.scalebar_accuracy = 0.0001
# set 'Tie Point Accuracy' to 0.1
chunk.tiepoint_accuracy = 0.1
# set 'Marker Projection Accuracy' to 0.1
chunk.marker_projection_accuracy = 0.1

# Add photos
chunk.addPhotos(imageFiles)

# Import cameras
chunk.importCameras(camerasPath)

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

doc.save(imagePath+"\\..\\"+name+"-final.psx")
