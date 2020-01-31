import bpy
import sys
import os
import json
import bmesh
import math
import mathutils

do_translate = False
do_rotate = False

#get args
argv = sys.argv
argv = argv[argv.index("--") + 1:]

#get import file extension
filename, file_extension = os.path.splitext(argv[0])
file_extension = file_extension.lower()

#import scene to be reoriented
if file_extension == '.obj':
	bpy.ops.import_scene.obj(filepath=argv[0], axis_forward='-Z', axis_up='Y')
elif file_extension == '.ply':
	bpy.ops.import_mesh.ply(filepath=argv[0])

#load and parse voyager file
f=open(argv[1],'r') 
data=json.load(f) 
f.close()

models = data['models']
model = models[0]

if 'rotation' in model:
	rotation = model['rotation']
	do_rotate = True
if 'translation' in model:	
	translation = model['translation']
	do_translate = True

for object in bpy.data.objects:
	if object.type == "MESH":

		me = object.data
		bm = bmesh.new()   
		bm.from_mesh(me)  

		matrix_world = object.matrix_world 
        
        # transform
		bmesh.ops.transform(bm, matrix=mathutils.Euler((math.radians(-90.0), 0.0, 0.0)).to_matrix(), space=matrix_world, verts=bm.verts) # change coordinate system
		if do_rotate:
			bmesh.ops.transform(bm, matrix=mathutils.Quaternion((rotation[3], rotation[0], rotation[1], rotation[2])).to_matrix(), space=matrix_world, verts=bm.verts)
		if do_translate: 
			bmesh.ops.transform(bm, matrix=mathutils.Matrix.Translation((translation[0], translation[1], translation[2])), space=matrix_world, verts=bm.verts)
		bmesh.ops.transform(bm, matrix=mathutils.Euler((math.radians(90.0), 0.0, 0.0)).to_matrix(), space=matrix_world, verts=bm.verts) # return to original coordinate system
			
        # write to mesh
		bm.to_mesh(me)
		bm.free()  
		
#create save file name
path = bpy.data.filepath
dir = os.path.dirname(path)
try: #check for provided output filename
	mod_filename = argv[2]
except IndexError:
	mod_filename = filename + '_oriented' + file_extension

#save reoriented scene
save_file = os.path.join(dir, mod_filename)
if file_extension == '.obj':
	bpy.ops.export_scene.obj(filepath=save_file, check_existing=False, axis_forward='-Z', axis_up='Y', use_materials=True)
elif file_extension == '.ply':
	bpy.ops.export_mesh.ply(filepath=save_file)