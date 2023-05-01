import sys
import pymeshlab
import argparse

def convert(s):
    if s.lower() == "true":
        return True
    else:
        return False

#get args
argv = sys.argv

#parse args
parser = argparse.ArgumentParser()
parser.add_argument("-i", "--input", required=True, help="Input filepath")
parser.add_argument("-s", "--script", required=True, help="Script filepath")
parser.add_argument("-o", "--output", required=False, help="Output filepath")
parser.add_argument("-vn", required=False, default=False, help="Write vertex normals")
parser.add_argument("-wt", required=False, default=False, help="Write texture coordinates")
args = parser.parse_args()

ms = pymeshlab.MeshSet()

ms.load_new_mesh(args.input)

# make sure mesh is pure triangles
ms.apply_filter("turn_into_a_pure_triangular_mesh")

# load the filter script and execute
ms.load_filter_script(args.script)
ms.apply_filter_script()

if args.output is not None:
    ms.save_current_mesh(args.output, save_vertex_normal=convert(args.vn), save_wedge_texcoord=convert(args.wt))
