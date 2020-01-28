import bpy
import sys
import os
import json
import bmesh
import mathutils

do_translate = False
do_rotate = False

#get args
argv = sys.argv
argv = argv[argv.index("--") + 1:]

#import scene to be reoriented
bpy.ops.import_scene.obj(filepath=argv[0], axis_forward='-Z', axis_up='Y')

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
		if do_rotate:
			bmesh.ops.transform(bm, matrix=mathutils.Quaternion((rotation[3], rotation[0], -rotation[2], rotation[1])).to_matrix(), space=matrix_world, verts=bm.verts)
		if do_translate: 
			bmesh.ops.transform(bm, matrix=mathutils.Matrix.Translation((translation[0],translation[1],translation[2])), space=matrix_world, verts=bm.verts)
			
        # write to mesh
		bm.to_mesh(me)
		bm.free()  
		
#save reoriented scene
path = bpy.data.filepath
dir = os.path.dirname(path)
filename = argv[0]
ext_index = filename.rfind('.')
mod_filename = filename[:ext_index] + '_oriented' + filename[ext_index:]
save_file = os.path.join(dir, mod_filename)
bpy.ops.export_scene.obj(filepath=save_file, check_existing=True, axis_forward='-Z', axis_up='Y', use_materials=False)